const MAX_AUDIO_BYTES = 12 * 1024 * 1024;
const MAX_TRANSCRIPT = 2400;
const ALLOWED_AUDIO = new Set([
  "audio/m4a", "audio/mp4", "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/webm", "audio/aac", "audio/x-m4a", "application/octet-stream"
]);

function cleanText(value, maximum = 500) {
  return String(value || "").trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, maximum);
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

function languageFallback(text) {
  const source = String(text || "");
  if (/[\u0E00-\u0E7F]/.test(source)) return { languageCode: "th-TH", languageName: "Thai" };
  if (/[äöüÄÖÜß]/.test(source) || /\b(?:und|bitte|zimmer|heute|morgen|buchung|stornieren|blockieren|danke)\b/i.test(source)) return { languageCode: "de-DE", languageName: "German" };
  if (/[áéíóúñ¿¡]/i.test(source) || /\b(?:por favor|habitación|reserva|gracias|mañana)\b/i.test(source)) return { languageCode: "es-ES", languageName: "Spanish" };
  if (/[àâçéèêëîïôûùüÿœæ]/i.test(source) || /\b(?:s'il vous plaît|chambre|réservation|merci|demain)\b/i.test(source)) return { languageCode: "fr-FR", languageName: "French" };
  return { languageCode: "en-US", languageName: "English" };
}

export async function analyzeVoiceTranscript(text, env) {
  const transcript = cleanText(text, MAX_TRANSCRIPT);
  const fallback = languageFallback(transcript);
  if (!transcript || !env?.OPENAI_API_KEY) return { ...fallback, routingText: transcript };
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: env.OPENAI_VOICE_ROUTING_MODEL || "gpt-5.6-luna",
        store: false,
        instructions: `Classify a hotel operator's spoken language and normalize the operational meaning into English for safe intent parsing.\n- Preserve every room/villa/unit number, guest/staff name, date, time, quantity, amount and brand exactly.\n- Do not add an action, room, date or fact that was not spoken.\n- language_code must be a practical BCP-47 speech locale such as en-US, th-TH, de-DE, fr-FR, es-ES, it-IT, nl-NL, zh-CN, ja-JP, ko-KR, ru-RU or another appropriate locale.\n- routing_english is only a semantic normalization; it is NOT authorization to execute anything.`,
        input: transcript,
        reasoning: { effort: "low" },
        max_output_tokens: 500,
        text: { format: { type: "json_schema", name: "taoedge_voice_language", strict: true, schema: {
          type: "object", additionalProperties: false,
          required: ["language_code", "language_name", "routing_english"],
          properties: {
            language_code: { type: "string" }, language_name: { type: "string" }, routing_english: { type: "string" }
          }
        } } }
      })
    });
    if (!response.ok) return { ...fallback, routingText: transcript };
    const body = await response.json();
    const parsed = JSON.parse(extractOutputText(body) || "{}");
    const languageCode = cleanText(parsed.language_code, 24) || fallback.languageCode;
    const languageName = cleanText(parsed.language_name, 60) || fallback.languageName;
    const routingText = cleanText(parsed.routing_english, MAX_TRANSCRIPT) || transcript;
    return { languageCode, languageName, routingText };
  } catch (_error) {
    return { ...fallback, routingText: transcript };
  }
}

export async function transcribeVoiceFile(file, env) {
  if (!env?.OPENAI_API_KEY) throw new Error("voice_ai_not_configured");
  const size = Number(file?.size) || 0;
  if (!file || typeof file.arrayBuffer !== "function") throw new Error("voice_file_required");
  if (size <= 0 || size > MAX_AUDIO_BYTES) throw new Error(size > MAX_AUDIO_BYTES ? "voice_file_too_large" : "voice_file_required");
  const type = cleanText(file.type, 100).toLowerCase() || "application/octet-stream";
  if (!ALLOWED_AUDIO.has(type) && !type.startsWith("audio/")) throw new Error("voice_file_type_unsupported");

  const upstream = new FormData();
  upstream.append("model", env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe");
  upstream.append("file", file, cleanText(file.name, 180) || "taoedge-voice.m4a");
  upstream.append("response_format", "json");
  upstream.append("prompt", "Hotel operations voice message. Transcribe exactly in the speaker's original language. Preserve room numbers, dates, times, quantities, guest names, staff names, property names and brands. Do not translate.");
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: upstream
  });
  if (!response.ok) throw new Error(`voice_transcription_failed_${response.status}`);
  const body = await response.json();
  const transcript = cleanText(body?.text, MAX_TRANSCRIPT);
  if (!transcript) throw new Error("voice_transcription_empty");
  return transcript;
}

export async function handleCopilotVoiceTranscription({ request, env, store, access }) {
  let form;
  try { form = await request.formData(); } catch (_error) { return { status: 400, body: { error: "invalid_voice_form" } }; }
  const file = form.get("audio");
  try {
    const transcript = await transcribeVoiceFile(file, env);
    const analysis = await analyzeVoiceTranscript(transcript, env);
    if (typeof store?.mobileRecordAudit === "function") {
      await store.mobileRecordAudit({
        tenantId: access?.record?.tenantId || "", userId: access?.record?.userId || "", membershipId: access?.record?.membershipId || "",
        action: "copilot_voice_transcribed", reference: "copilot:voice",
        metadata: { language: analysis.languageCode, bytes: Number(file?.size) || 0, transcriptCharacters: transcript.length },
        createdAt: access?.now || new Date().toISOString()
      });
    }
    return { status: 200, body: { ok: true, transcript, languageCode: analysis.languageCode, languageName: analysis.languageName, routingText: analysis.routingText } };
  } catch (error) {
    const code = cleanText(error?.message, 100) || "voice_transcription_failed";
    const status = code === "voice_file_required" || code === "voice_file_type_unsupported" ? 400 : code === "voice_file_too_large" ? 413 : code === "voice_ai_not_configured" ? 503 : 502;
    return { status, body: { error: code } };
  }
}

export async function localizeVoiceReply(reply, languageCode, env) {
  const source = cleanText(reply, 1800);
  const target = cleanText(languageCode, 24);
  if (!source || !target || /^en(?:-|$)/i.test(target) || !env?.OPENAI_API_KEY) return source;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: env.OPENAI_VOICE_ROUTING_MODEL || "gpt-5.6-luna",
        store: false,
        instructions: `Translate this private hotel-operations assistant reply into ${target}. Keep it concise and natural. Preserve every room/villa/unit number, date, time, amount, guest/staff name and operational fact exactly. Do not add promises or actions. Return only the translated reply.`,
        input: source,
        reasoning: { effort: "low" },
        max_output_tokens: 900
      })
    });
    if (!response.ok) return source;
    const body = await response.json();
    return cleanText(extractOutputText(body), 1800) || source;
  } catch (_error) { return source; }
}
