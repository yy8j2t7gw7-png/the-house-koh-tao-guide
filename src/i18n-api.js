const LANGUAGE_NAMES = Object.freeze({
  en: "English",
  th: "Thai",
  "zh-CN": "Simplified Chinese",
  ru: "Russian",
  de: "German",
  fr: "French",
  es: "Spanish"
});

const MAX_TEXTS = 24;
const MAX_TEXT_LENGTH = 1800;
const MAX_TOTAL_LENGTH = 12_000;
const MODEL_BATCH_SIZE = 8;
const TRANSLATION_CACHE_VERSION = "v3";

const COMMON_APPROVED_ASSETS = [
  "/data/concierge-knowledge.json",
  "/ai-concierge-config.js",
  "/ai-concierge.js",
  "/guide-app.js",
  "/passport-upload.js",
  "/platform-actions.js",
  "/registration-entry.js",
  "/room-app.js",
  "/room-data.js"
];
let commonBundlesPromise;
const pageBundlePromises = new Map();

const TRANSLATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["translations"],
  properties: {
    translations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "text"],
        properties: {
          id: { type: "string", minLength: 64, maxLength: 64 },
          text: { type: "string", minLength: 1, maxLength: MAX_TEXT_LENGTH }
        }
      }
    }
  }
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders
    }
  });
}

function validLanguage(value) {
  const language = String(value || "");
  return Object.hasOwn(LANGUAGE_NAMES, language) ? language : "";
}

function cleanText(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, MAX_TEXT_LENGTH);
}

async function readJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Response("JSON required", { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 28_000) throw new Response("Request too large", { status: 413 });
  const raw = await request.text();
  if (raw.length > 28_000) throw new Response("Request too large", { status: 413 });
  try {
    return JSON.parse(raw || "{}");
  } catch (_error) {
    throw new Response("Invalid JSON", { status: 400 });
  }
}

function getStore(env) {
  if (!env.CONCIERGE_STORE?.getByName) return null;
  return env.CONCIERGE_STORE.getByName("the-house-concierge-global");
}

function decodeCommonEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function normalizedPagePath(value) {
  const raw = String(value || "/").split("?")[0].split("#")[0];
  if (raw === "/" || raw === "") return "/index.html";
  if (/^\/room\/(?:[1-9]|1[01])\/?$/.test(raw)) return "/room.html";
  if (raw === "/room" || raw === "/room/") return "/rooms.html";
  if (raw === "/passport-upload" || raw === "/passport-upload/") return "/passport-upload.html";
  if (/^\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.html$/.test(raw)) return raw;
  return "";
}

async function loadAssetText(request, env, path) {
  const assetUrl = new URL(path, request.url);
  const response = await env.ASSETS.fetch(new Request(assetUrl, {
    method: "GET",
    headers: { accept: "text/html,application/json,text/javascript" }
  }));
  if (!response.ok) return "";
  return decodeCommonEntities(await response.text());
}

async function approvedSourceBundles(request, env, page) {
  const pagePath = normalizedPagePath(page);
  commonBundlesPromise ||= Promise.all(
    COMMON_APPROVED_ASSETS.map((path) => loadAssetText(request, env, path))
  );
  const common = await commonBundlesPromise;
  if (!pagePath) return common;
  if (!pageBundlePromises.has(pagePath)) {
    pageBundlePromises.set(pagePath, loadAssetText(request, env, pagePath));
  }
  return [...common, await pageBundlePromises.get(pagePath)];
}

function sourceIsApproved(text, bundles) {
  if (!text || text.length > MAX_TEXT_LENGTH) return false;
  const jsonEscaped = JSON.stringify(text).slice(1, -1);
  if (bundles.some((bundle) => bundle.includes(text) || bundle.includes(jsonEscaped))) return true;
  const templatePattern = text
    .split(/(\d+(?::\d+)?)/g)
    .map((part, index) => index % 2
      ? "(?:\\d+(?::\\d+)?|\\$\\{[^}\\r\\n]{1,80}\\})"
      : part
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/[“”]/g, '[“”"`]')
        .replace(/[’']/g, "[’']"))
    .join("");
  try {
    const matcher = new RegExp(templatePattern);
    if (bundles.some((bundle) => matcher.test(bundle))) return true;
  } catch (_error) {
    // Continue to the explicit safe runtime patterns below.
  }
  return /^(?:Room (?:[1-9]|1[01])(?: · (?:Upstairs|Downstairs))?|Welcome to Room (?:[1-9]|1[01])|Finding Room (?:[1-9]|1[01])|Room (?:[1-9]|1[01]) \| The House – Koh Tao|Room (?:[1-9]|1[01]) (?:arrival photo placeholder|highlighted on the building|location))$/.test(text);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function extractOutputText(responseBody) {
  for (const item of responseBody?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

async function callTranslationModel(env, language, entries) {
  const target = LANGUAGE_NAMES[language];
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_TRANSLATION_MODEL || env.OPENAI_MODEL || "gpt-5.6",
      store: false,
      instructions: `Translate approved guest-guide text from English into ${target} (${language}).\n\nQUALITY RULES\n- Use natural, accurate language suitable for a professional hotel concierge.\n- Preserve every fact. Do not add, remove, soften or reinterpret information.\n- Preserve The House, The House – Koh Tao, Koh Tao, Mae Haad, Roctopus Dive, Bamboo Beach Bar and all other business or place names unless a conventional local-script rendering is clearly part of the supplied name.\n- Preserve all numbers, telephone numbers, prices, fees, currencies, times, dates, URLs, room numbers and filename extensions exactly.\n- Preserve emoji and directional arrows.\n- Translate labels and prose, not identifiers.\n- Return exactly one translation for every supplied id.`,
      input: [{
        role: "user",
        content: JSON.stringify({ targetLanguage: language, entries })
      }],
      reasoning: { effort: env.OPENAI_TRANSLATION_REASONING_EFFORT || "medium" },
      max_output_tokens: 9000,
      text: {
        format: {
          type: "json_schema",
          name: "house_guide_translations",
          strict: true,
          schema: TRANSLATION_SCHEMA
        }
      }
    })
  });
  if (!response.ok) throw new Error(`Translation request failed (${response.status}).`);
  const parsed = JSON.parse(extractOutputText(await response.json()));
  const expected = new Set(entries.map((entry) => entry.id));
  const translated = new Map();
  for (const entry of parsed?.translations || []) {
    const id = String(entry?.id || "");
    const text = cleanText(entry?.text);
    if (expected.has(id) && text) translated.set(id, text);
  }
  if (translated.size !== entries.length) throw new Error("Incomplete translation response.");
  return translated;
}

async function translateModelRecords(env, language, records) {
  const translated = new Map();
  const failed = new Set();

  async function translateGroup(group) {
    if (!group.length) return;
    try {
      const result = await callTranslationModel(env, language, group.map((record) => ({
        id: record.sourceHash,
        text: record.text
      })));
      group.forEach((record) => translated.set(record.cacheKey, result.get(record.sourceHash)));
    } catch (_error) {
      if (group.length === 1) {
        failed.add(group[0].cacheKey);
        return;
      }
      const middle = Math.ceil(group.length / 2);
      await translateGroup(group.slice(0, middle));
      await translateGroup(group.slice(middle));
    }
  }

  const groups = [];
  for (let index = 0; index < records.length; index += MODEL_BATCH_SIZE) {
    groups.push(records.slice(index, index + MODEL_BATCH_SIZE));
  }
  await Promise.all(groups.map(translateGroup));
  return { translated, failed };
}

async function translateApprovedTextsDetailed(env, language, texts) {
  const targetLanguage = validLanguage(language);
  const cleaned = (Array.isArray(texts) ? texts : []).map(cleanText);
  if (!targetLanguage || targetLanguage === "en") {
    return cleaned.map((translation) => ({ translation, translated: true }));
  }
  if (!env.OPENAI_API_KEY) throw new Error("Translation service is not configured.");

  const records = await Promise.all(cleaned.map(async (text) => {
    const sourceHash = await sha256(text);
    return { text, sourceHash, cacheKey: `${TRANSLATION_CACHE_VERSION}:${targetLanguage}:${sourceHash}` };
  }));
  const store = getStore(env);
  const cachedResult = store?.getTranslations
    ? await store.getTranslations(records.map((record) => record.cacheKey)).catch(() => ({}))
    : {};
  const cached = cachedResult && typeof cachedResult === "object" ? cachedResult : {};
  const missingByKey = new Map();
  records.forEach((record) => {
    if (!cached?.[record.cacheKey]) missingByKey.set(record.cacheKey, record);
  });
  const missing = [...missingByKey.values()];

  if (missing.length) {
    const { translated } = await translateModelRecords(env, targetLanguage, missing);
    const additions = missing
      .filter((record) => translated.has(record.cacheKey))
      .map((record) => ({
        cacheKey: record.cacheKey,
        language: targetLanguage,
        sourceHash: record.sourceHash,
        translation: translated.get(record.cacheKey)
      }));
    additions.forEach((entry) => { cached[entry.cacheKey] = entry.translation; });
    if (additions.length && store?.saveTranslations) await store.saveTranslations(additions).catch(() => {});
  }

  return records.map((record) => ({
    translation: cached?.[record.cacheKey] || record.text,
    translated: Boolean(cached?.[record.cacheKey])
  }));
}

export async function translateApprovedTexts(env, language, texts) {
  const results = await translateApprovedTextsDetailed(env, language, texts);
  return results.map((result) => result.translation);
}

async function enforceRateLimit(request, env) {
  if (!env.CONCIERGE_RATE_LIMITER?.limit) return true;
  const client = request.headers.get("cf-connecting-ip") || "unknown";
  const digest = await sha256(client);
  const result = await env.CONCIERGE_RATE_LIMITER.limit({ key: `i18n:${digest.slice(0, 24)}` });
  return Boolean(result?.success);
}

export async function handleTranslationRequest(request, env) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
  let body;
  try {
    body = await readJson(request);
  } catch (response) {
    if (response instanceof Response) return response;
    return json({ error: "invalid_request" }, 400);
  }

  const language = validLanguage(body.language);
  const texts = Array.isArray(body.texts) ? body.texts.map(cleanText) : [];
  if (!language || language === "en" || !texts.length || texts.length > MAX_TEXTS) {
    return json({ error: "invalid_request" }, 400);
  }
  if (texts.some((text) => !text) || texts.reduce((total, text) => total + text.length, 0) > MAX_TOTAL_LENGTH) {
    return json({ error: "invalid_request" }, 400);
  }
  if (!(await enforceRateLimit(request, env))) {
    return json({ error: "rate_limited" }, 429);
  }

  const bundles = await approvedSourceBundles(request, env, body.page);
  const approved = texts.map((text) => sourceIsApproved(text, bundles));
  if (!approved.some(Boolean)) {
    return json({ error: "unapproved_source_text" }, 403);
  }

  try {
    const approvedTexts = texts.filter((_text, index) => approved[index]);
    const approvedTranslations = await translateApprovedTextsDetailed(env, language, approvedTexts);
    let translatedIndex = 0;
    const retryable = [];
    const translations = texts.map((_text, index) => {
      if (!approved[index]) return null;
      const result = approvedTranslations[translatedIndex];
      translatedIndex += 1;
      if (!result.translated) {
        retryable.push(index);
        return null;
      }
      return result.translation;
    });
    return json({
      language,
      translations,
      untranslated: approved.filter((value) => !value).length + retryable.length,
      retryable
    });
  } catch (_error) {
    return json({ error: "translation_unavailable" }, 503);
  }
}

export { LANGUAGE_NAMES, validLanguage };
