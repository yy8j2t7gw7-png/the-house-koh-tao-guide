const STOP_WORDS = new Set([
  "a", "am", "an", "and", "are", "at", "be", "can", "could", "do",
  "does", "for", "from", "have", "how", "i", "is", "it", "me", "my",
  "of", "on", "please", "the", "there", "to", "we", "what", "when",
  "where", "which", "with", "would", "you"
]);

export const PROTECTED_INTENTS = new Set([
  "lost_key",
  "property_emergency",
  "medical_emergency"
]);

const PROTECTED_MINIMUM_SCORE = 0.72;

export const ALLOWED_CATEGORIES = new Set([
  "arrival",
  "booking",
  "concierge",
  "departure",
  "emergency",
  "fallback",
  "house-rules",
  "practical",
  "pre-booking",
  "property-emergency",
  "room",
  "stay-support"
]);

export const ALLOWED_HANDOFFS = new Set([
  "none",
  "stay_support",
  "booking",
  "property_emergency",
  "medical_emergency"
]);

export function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bcheckin\b/g, "check in")
    .replace(/\bcheckout\b/g, "check out")
    .replace(/\bwi-fi\b/g, "wifi")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  const all = normalizeText(value).split(" ").filter(Boolean);
  const useful = all.filter((token) => !STOP_WORDS.has(token));
  return useful.length ? useful : all;
}

function editDistance(left, right) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const saved = row[j];
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + cost);
      previous = saved;
    }
  }
  return row[right.length];
}

function tokenMatches(queryToken, triggerToken) {
  if (queryToken === triggerToken) return true;
  if (queryToken.length < 5 || triggerToken.length < 5) return false;
  return editDistance(queryToken, triggerToken) <= 1;
}

export function triggerScore(question, trigger) {
  const query = normalizeText(question);
  const candidate = normalizeText(trigger);
  if (!query || !candidate) return 0;
  if (query === candidate) return 1;
  if (query.includes(candidate)) return 0.96;
  if (candidate.includes(query) && tokens(query).length > 0) return 0.86;

  const queryTokens = tokens(query);
  const triggerTokens = tokens(candidate);
  let matches = 0;
  const used = new Set();

  triggerTokens.forEach((triggerToken) => {
    const index = queryTokens.findIndex(
      (queryToken, queryIndex) => !used.has(queryIndex) && tokenMatches(queryToken, triggerToken)
    );
    if (index >= 0) {
      used.add(index);
      matches += 1;
    }
  });

  if (!matches) return 0;
  const coverage = matches / triggerTokens.length;
  const precision = matches / queryTokens.length;
  return (coverage * 0.68) + (precision * 0.32);
}

function fallbackFor(question, knowledge) {
  const normalizedQuestion = normalizeText(question);
  let best = { id: "default", length: 0 };
  (knowledge.fallbackClassifiers || []).forEach((classifier) => {
    (classifier.terms || []).forEach((term) => {
      const normalizedTerm = normalizeText(term);
      if (normalizedQuestion.includes(normalizedTerm) && normalizedTerm.length > best.length) {
        best = { id: classifier.id, length: normalizedTerm.length };
      }
    });
  });
  return knowledge.fallbacks?.[best.id] || knowledge.fallbacks?.default;
}

export function matchKnowledge(question, knowledge, minimumScore = 0.44) {
  let best = null;
  for (const intent of knowledge?.intents || []) {
    const score = Math.max(0, ...(intent.triggers || []).map((trigger) => triggerScore(question, trigger)));
    const priority = Number(intent.priority) || 0;
    if (!best || score > best.score || (score === best.score && priority > best.priority)) {
      best = { intent, score, priority };
    }
  }

  if (best && best.score >= minimumScore) {
    return {
      matched: true,
      intentId: best.intent.id,
      category: best.intent.category,
      confidence: best.score,
      answer: best.intent.answer,
      actions: best.intent.actions || []
    };
  }

  const fallback = fallbackFor(question, knowledge) || { answer: "I do not have a confirmed answer for that yet.", actions: [] };
  return {
    matched: false,
    intentId: "fallback",
    category: fallback.category || "fallback",
    confidence: best?.score || 0,
    answer: fallback.answer,
    actions: fallback.actions || []
  };
}

export function handoffForCategory(category) {
  if (category === "booking") return "booking";
  if (category === "stay-support") return "stay_support";
  if (category === "property-emergency") return "property_emergency";
  if (category === "emergency") return "medical_emergency";
  return "none";
}

export function actionsForHandoff(handoff, question = "") {
  const supportMessage = "Hello, I am staying in {roomLabel} at The House and need help with: {question}";
  const actions = {
    stay_support: [
      { label: "Contact Us", type: "route", route: "houseWhatsapp", message: supportMessage },
      { label: "Call Us", type: "route", route: "houseCall" }
    ],
    booking: [
      { label: "Book with Us", type: "prompt", prompt: "I would like to make a booking." },
      { label: "Call Us", type: "route", route: "houseCall" }
    ],
    property_emergency: [
      { label: "Call Emergency Support", type: "route", route: "propertyEmergencyCall", style: "danger" },
      { label: "Send Urgent Message", type: "route", route: "propertyEmergencyWhatsapp", message: "URGENT property problem at The House, {roomLabel}: {question}", style: "danger" },
      { label: "Call Koh Tao Rescue", type: "route", route: "rescueCall", style: "danger" },
      { label: "Call Medical Emergency 1669", type: "route", route: "medicalNationalCall" }
    ],
    medical_emergency: [
      { label: "Call Koh Tao Rescue", type: "route", route: "rescueCall", style: "danger" },
      { label: "Call Medical Emergency 1669", type: "route", route: "medicalNationalCall", style: "danger" }
    ]
  };
  return actions[handoff] || [];
}

export function sanitizeQuestion(value, maximum = 800) {
  const source = String(value || "").slice(0, maximum);
  const passportLabels = source.match(/\b(?:passport(?:\s+(?:number|no\.?|id))?|surname|given names?|nationality|date of birth|place of birth|date of issue|date of expiry)\b/gi) || [];
  if (new Set(passportLabels.map((label) => label.toLowerCase())).size >= 2) {
    return "[passport information removed]";
  }
  return source
    .replace(/https?:\/\/\S+/gi, "[link removed]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email removed]")
    .replace(/(?:\+?\d[\d\s()-]{7,}\d)/g, "[number removed]")
    .replace(/\b(?:(?:key[\s-]?box|lock[\s-]?box|door|access|room)\s*)?(?:code|pin)\s*(?:(?:is|:|=|#|-)\s*)?(?=[A-Z0-9-]{3,16}\b)(?=[A-Z0-9-]*\d)[A-Z0-9-]{3,16}\b/gi, "[protected code removed]")
    .replace(/\b(?:stay|access|guest|private)\s+(?:token|nonce|reference)\s*(?:(?:is|:|=|#|-)\s*)?[A-Z0-9_-]{5,80}\b/gi, "[private token removed]")
    .replace(/\b(passport|booking|reservation)\s*(?:(?:number|no\.?|id)\s*[:#-]?\s*|[:#-]\s*)[A-Z0-9-]{5,}\b/gi, "$1 [identifier removed]")
    .replace(/\b(passport)\s+(?=[A-Z0-9-]{5,}\b)(?=[A-Z0-9-]*\d)[A-Z0-9-]+\b/gi, "$1 [identifier removed]")
    .replace(/\s+/g, " ")
    .trim();
}

export function learningClusterKey(question) {
  const useful = tokens(question)
    .filter((token) => token.length > 2)
    .slice(0, 8)
    .sort();
  return (useful.join("-") || "unclassified").slice(0, 160);
}

export function shouldUseDeterministic(match, history = []) {
  if (!match?.matched) return false;
  if (PROTECTED_INTENTS.has(match.intentId)) return match.confidence >= PROTECTED_MINIMUM_SCORE;
  if (match.confidence < 0.94) return false;
  const latestContext = history.slice(-2).map((item) => normalizeText(item.content)).join(" ");
  return !/\b(also|and|that|then|tomorrow|tonight|what about|what if)\b/.test(latestContext);
}

export function clampNumber(value, minimum, maximum, fallback = minimum) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(maximum, Math.max(minimum, numeric));
}
