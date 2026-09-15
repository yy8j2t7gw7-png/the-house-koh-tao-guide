import assert from "node:assert/strict";
import test from "node:test";
import { analyzeVoiceTranscript } from "../src/voice-copilot.js";

test("v5.11.85 voice language fallback recognizes Thai without requiring an external model", async () => {
  const result = await analyzeVoiceTranscript("ห้อง 6 ต้องการผ้าเช็ดตัวสองผืน", {});
  assert.equal(result.languageCode, "th-TH");
  assert.equal(result.languageName, "Thai");
  assert.match(result.routingText, /ห้อง 6/);
});

test("v5.11.85 voice language fallback recognizes German operational speech", async () => {
  const result = await analyzeVoiceTranscript("Bitte Zimmer 4 morgen blockieren", {});
  assert.equal(result.languageCode, "de-DE");
  assert.equal(result.languageName, "German");
});
