import { normalizeText } from "./concierge-core.js";

const DATASETS = [
  { path: "/data/activities.json", key: "activities", sourceType: "activity", publicPage: "/activity.html" },
  { path: "/data/bars.json", key: "bars", sourceType: "bar", publicPage: "/bar.html" },
  { path: "/data/beaches.json", key: "beaches", sourceType: "beach", publicPage: "/beach.html" },
  { path: "/data/cafes.json", key: "cafes", sourceType: "cafe", publicPage: "/cafe.html" },
  { path: "/data/places.json", key: "places", sourceType: "restaurant", publicPage: "/restaurant.html" },
  { path: "/data/shopping.json", key: "items", sourceType: "shopping", publicPage: "/shop.html" }
];

const QUERY_STOP_WORDS = new Set([
  "about", "best", "could", "find", "good", "help", "looking", "need", "please",
  "recommend", "recommended", "recommendation", "should", "suitable", "tell", "want",
  "what", "where", "which", "would"
]);

const DATASET_HINTS = [
  { pattern: /\b(dive|diving|scuba|freediv|snorkel|boat|kayak|paddle|hike|viewpoint|climb|yoga|muay|massage|spa|cook|wildlife|photo|activity|experience)\w*\b/i, types: ["activity"] },
  { pattern: /\b(bar|drink|cocktail|beer|nightlife|music|sunset|party)\w*\b/i, types: ["bar", "beach"] },
  { pattern: /\b(beach|bay|swim|sand|shore|snorkel|sunset)\w*\b/i, types: ["beach", "activity", "bar"] },
  { pattern: /\b(cafe|coffee|breakfast|brunch|bakery|pastry|remote work)\w*\b/i, types: ["cafe", "restaurant"] },
  { pattern: /\b(restaurant|dinner|lunch|eat|food|meal|romantic|vegan|vegetarian|thai|italian)\w*\b/i, types: ["restaurant"] },
  { pattern: /\b(shop|shopping|supermarket|pharmacy|souvenir|atm|essential|grocery)\w*\b/i, types: ["shopping"] }
];

const EXPANSIONS = new Map([
  ["dive", ["diving", "scuba", "raid", "padi", "ssi"]],
  ["diving", ["dive", "scuba", "raid", "padi", "ssi"]],
  ["snorkel", ["snorkelling", "snorkeling"]],
  ["snorkelling", ["snorkel", "snorkeling"]],
  ["snorkeling", ["snorkel", "snorkelling"]],
  ["bar", ["drinks", "cocktails", "nightlife"]],
  ["restaurant", ["dinner", "food", "meal"]],
  ["cafe", ["coffee", "breakfast", "brunch"]]
]);

function cleanText(value, maximum = 900) {
  if (value === null || value === undefined || value === "") return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text
    .replace(/cite[^]*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function listText(value) {
  if (Array.isArray(value)) return value.map((item) => cleanText(item, 180)).filter(Boolean).join(", ");
  return cleanText(value, 500);
}

function queryTerms(question) {
  const base = normalizeText(question)
    .split(" ")
    .filter((term) => term.length >= 3 && !QUERY_STOP_WORDS.has(term));
  const expanded = new Set(base);
  base.forEach((term) => (EXPANSIONS.get(term) || []).forEach((extra) => expanded.add(extra)));
  return [...expanded].slice(0, 24);
}

function nested(record, field) {
  return record?.[field] ?? record?.content?.[field] ?? "";
}

function searchableRecord(record) {
  return normalizeText([
    record.name,
    record.shortName,
    record.type,
    record.category,
    record.categoryGroup,
    listText(record.categories),
    listText(record.tags),
    record.area,
    record.bestKnownFor,
    listText(nested(record, "perfectFor")),
    listText(nested(record, "aiKeywords")),
    nested(record, "cardDescription"),
    nested(record, "description"),
    nested(record, "about"),
    nested(record, "recommendation"),
    nested(record, "localTip"),
    record.conciergeNotes,
    nested(record, "aiSummary"),
    record.whyChoose,
    record.whatMakesDifferent
  ].filter(Boolean).join(" "));
}

function recordScore(record, terms) {
  if (!terms.length) return 0;
  const haystack = searchableRecord(record);
  const name = normalizeText(record.name);
  let score = 0;
  terms.forEach((term) => {
    if (haystack.includes(term)) score += 2;
    if (name.includes(term)) score += 4;
  });
  if (!score) return 0;
  if (record.preferred === true) score += 5;
  if (record.featured === true) score += 1;
  if (record.status && record.status !== "active") score -= 4;
  return score;
}

function compactRecord(definition, record, score) {
  const summary = nested(record, "aiSummary")
    || nested(record, "description")
    || nested(record, "about")
    || nested(record, "cardDescription");
  const recommendation = record.conciergeNotes || nested(record, "recommendation") || record.whyChoose;
  const practical = record.practicalInfo || nested(record, "localTip");
  const categories = listText(record.categories || record.category || record.categoryGroup);
  const perfectFor = listText(nested(record, "perfectFor"));
  const details = {
    sourceType: definition.sourceType,
    id: cleanText(record.id, 120),
    name: cleanText(record.name, 180),
    area: cleanText(record.area, 240),
    categories,
    preferredByTheHouse: record.preferred === true || undefined,
    summary: cleanText(summary, 1000),
    recommendation: cleanText(recommendation, 900),
    practical: cleanText(practical, 500),
    perfectFor,
    bestKnownFor: cleanText(record.bestKnownFor, 400),
    price: cleanText(record.price || record.priceLevel, 240),
    hours: cleanText(record.hours, 300),
    safety: cleanText(record.safety, 500),
    weather: cleanText(record.weatherConsiderations || record.conditions, 400),
    childFriendly: cleanText(record.childFriendly ?? record.familyFriendly, 120),
    lastVerified: cleanText(record.lastVerified || record.notes?.lastVerified, 80),
    publicPath: record.id ? `${definition.publicPage}?id=${encodeURIComponent(record.id)}` : "",
    relevanceScore: score
  };
  return Object.fromEntries(Object.entries(details).filter(([, value]) => value !== "" && value !== undefined));
}

function selectedDatasets(question) {
  const matchingTypes = new Set();
  DATASET_HINTS.forEach((hint) => {
    if (hint.pattern.test(question)) hint.types.forEach((type) => matchingTypes.add(type));
  });
  return matchingTypes.size
    ? DATASETS.filter((dataset) => matchingTypes.has(dataset.sourceType))
    : DATASETS;
}

async function fetchDataset(request, env, definition) {
  const url = new URL(definition.path, request.url);
  const response = await env.ASSETS.fetch(new Request(url, {
    method: "GET",
    headers: { accept: "application/json" }
  }));
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data?.[definition.key])
    ? data[definition.key].map((record) => ({ definition, record }))
    : [];
}

export async function retrieveApprovedProjectKnowledge(request, env, question, maximumRecords = 6) {
  const terms = queryTerms(question);
  const datasets = selectedDatasets(question);
  const loaded = await Promise.all(datasets.map((definition) => fetchDataset(request, env, definition).catch(() => [])));
  return loaded
    .flat()
    .map(({ definition, record }) => ({ definition, record, score: recordScore(record, terms) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || Number(left.record.displayOrder || 999) - Number(right.record.displayOrder || 999))
    .slice(0, maximumRecords)
    .map(({ definition, record, score }) => compactRecord(definition, record, score));
}

