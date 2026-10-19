import test from "node:test";
import assert from "node:assert/strict";
import { runAI, generateImage } from "../integrations/ai.js";

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


test("generateImage uses Gemini native image output without OpenAI/Lovable keys", async () => {
  const envKeys = ["GEMINI_API_KEY", "GEMINI_IMAGE_MODEL", "AI_IMAGE_MODEL", "OPENAI_API_KEY", "LOVABLE_API_KEY", "AI_API_KEY"];
  const before = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.GEMINI_IMAGE_MODEL = "gemini-image-test";
  delete process.env.AI_IMAGE_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.LOVABLE_API_KEY;
  delete process.env.AI_API_KEY;
  const oldFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url: String(url), options };
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "aGVsbG8=" } }] } }]
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const result = await generateImage({ prompt: "foto de bacon defumado" });
    assert.equal(result.b64, "aGVsbG8=");
    assert.equal(result.mimeType, "image/png");
    assert.equal(result.model, "gemini-image-test");
    assert.match(request.url, /models\/gemini-image-test:generateContent/);
    assert.equal(request.options.headers["x-goog-api-key"], "test-gemini-key");
    assert.equal(JSON.parse(request.options.body).generationConfig.responseModalities.includes("IMAGE"), true);
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of envKeys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
});
