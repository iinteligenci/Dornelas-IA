import test from "node:test";
import assert from "node:assert/strict";
import { runAI } from "../integrations/ai.js";

const originalFetch = globalThis.fetch;
const originalEnv = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_API_BASE_URL: process.env.GEMINI_API_BASE_URL,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  AI_RETRY_COUNT: process.env.AI_RETRY_COUNT
};

test("runAI retries temporary provider errors and returns a successful response", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_API_BASE_URL = "https://example.test/v1beta/openai";
  process.env.GEMINI_MODEL = "gemini-3.8-flash";
  process.env.AI_RETRY_COUNT = "2";
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({ error: { message: "temporarily overloaded" } }), {
        status: 503, headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      model: "gemini-3.8-flash",
      choices: [{ message: { content: "OK" } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const result = await runAI({ input: "Responda OK" });
    assert.equal(result.text, "OK");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runAI does not retry permanent provider errors and exposes useful details", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_API_BASE_URL = "https://example.test/v1beta/openai";
  process.env.GEMINI_MODEL = "gemini-3.8-flash";
  process.env.AI_RETRY_COUNT = "2";
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ error: { message: "invalid API key" } }), {
      status: 401, headers: { "Content-Type": "application/json" }
    });
  };
  try {
    await assert.rejects(runAI({ input: "Responda OK" }), /HTTP 401.*invalid API key/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
