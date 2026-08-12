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
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\b\d+(?::\d+)?\\b/g, "(?:\\d+(?::\\d+)?)")
    .replace(/[“”]/g, '[“”"`]')
    .replace(/[’']/g, "[’']");
  try {
    const matcher = new RegExp(templatePattern);
    return bundles.some((bundle) => matcher.test(bundle));
  } catch (_error) {
    return false;
  }
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
      reasoning: { effort: env.OPENAI_TRANSLATION_REASONING_EFFORT || "low" },
      max_output_tokens: 6000,
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

export async function translateApprovedTexts(env, language, texts) {
  const targetLanguage = validLanguage(language);
  const cleaned = (Array.isArray(texts) ? texts : []).map(cleanText);
  if (!targetLanguage || targetLanguage === "en") return cleaned;
  if (!env.OPENAI_API_KEY) throw new Error("Translation service is not configured.");

  const records = await Promise.all(cleaned.map(async (text) => {
    const sourceHash = await sha256(text);
    return { text, sourceHash, cacheKey: `${targetLanguage}:${sourceHash}` };
  }));
  const store = getStore(env);
  const cached = store?.getTranslations
    ? await store.getTranslations(records.map((record) => record.cacheKey)).catch(() => ({}))
    : {};
  const missing = records.filter((record) => !cached?.[record.cacheKey]);

  if (missing.length) {
    const translated = await callTranslationModel(env, targetLanguage, missing.map((record) => ({
      id: record.sourceHash,
      text: record.text
    })));
    const additions = missing.map((record) => ({
      cacheKey: record.cacheKey,
      language: targetLanguage,
      sourceHash: record.sourceHash,
      translation: translated.get(record.sourceHash)
    }));
    additions.forEach((entry) => { cached[entry.cacheKey] = entry.translation; });
    if (store?.saveTranslations) await store.saveTranslations(additions).catch(() => {});
  }

  return records.map((record) => cached?.[record.cacheKey] || record.text);
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
  if (texts.some((text) => !sourceIsApproved(text, bundles))) {
    return json({ error: "unapproved_source_text" }, 403);
  }

  try {
    const translations = await translateApprovedTexts(env, language, texts);
    return json({ language, translations });
  } catch (_error) {
    return json({ error: "translation_unavailable" }, 503);
  }
}

export { LANGUAGE_NAMES, validLanguage };
