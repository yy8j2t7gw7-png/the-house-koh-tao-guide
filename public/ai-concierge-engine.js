(function () {
  const DEFAULT_STOP_WORDS = new Set([
    "a", "am", "an", "and", "are", "at", "be", "can", "could", "do",
    "does", "for", "from", "have", "how", "i", "is", "it", "me", "my",
    "of", "on", "please", "the", "there", "to", "we", "what", "when",
    "where", "which", "with", "would", "you"
  ]);

  function normalize(value) {
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
    const all = normalize(value).split(" ").filter(Boolean);
    const useful = all.filter((token) => !DEFAULT_STOP_WORDS.has(token));
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

  function triggerScore(question, trigger) {
    const query = normalize(question);
    const candidate = normalize(trigger);
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

  function classifyFallback(question, knowledge) {
    const normalizedQuestion = normalize(question);
    let best = { id: "default", length: 0 };
    (knowledge.fallbackClassifiers || []).forEach((classifier) => {
      (classifier.terms || []).forEach((term) => {
        const normalizedTerm = normalize(term);
        if (normalizedQuestion.includes(normalizedTerm) && normalizedTerm.length > best.length) {
          best = { id: classifier.id, length: normalizedTerm.length };
        }
      });
    });
    return knowledge.fallbacks?.[best.id] || knowledge.fallbacks?.default;
  }

  function validateKnowledge(knowledge) {
    if (!knowledge || !Array.isArray(knowledge.intents) || !knowledge.fallbacks?.default) {
      throw new Error("The concierge knowledge file is invalid.");
    }
    return knowledge;
  }

  async function create(options = {}) {
    const knowledgeUrl = options.knowledgeUrl || "/data/concierge-knowledge.json";
    const minimumScore = Number.isFinite(options.minimumScore) ? options.minimumScore : 0.62;
    const response = await fetch(knowledgeUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Concierge knowledge could not be loaded (${response.status}).`);
    const knowledge = validateKnowledge(await response.json());

    return {
      knowledge,
      answer(question) {
        let best = null;
        knowledge.intents.forEach((intent) => {
          const score = Math.max(0, ...(intent.triggers || []).map((trigger) => triggerScore(question, trigger)));
          const priority = Number(intent.priority) || 0;
          if (!best || score > best.score || (score === best.score && priority > best.priority)) {
            best = { intent, score, priority };
          }
        });

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

        const fallback = classifyFallback(question, knowledge) || knowledge.fallbacks.default;
        return {
          matched: false,
          intentId: "fallback",
          category: fallback.category || "fallback",
          confidence: best?.score || 0,
          answer: fallback.answer,
          actions: fallback.actions || []
        };
      }
    };
  }

  window.HOUSE_CONCIERGE_ENGINE = { create, normalize, triggerScore };
})();
