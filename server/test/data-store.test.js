import test from "node:test";
import assert from "node:assert/strict";
import { createGitHubJsonStore } from "../integrations/data-store.js";

const encode = value => Buffer.from(JSON.stringify(value)).toString("base64");
const okJson = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const env = { DATA_STORE_TOKEN: "test-token-not-a-real-secret", DATA_STORE_REPO: "owner/private-data", DATA_STORE_BRANCH: "main" };

test("data store refuses missing private-repository configuration without network access", async () => {
  let calls = 0;
  const store = createGitHubJsonStore({ env: {}, fetchImpl: async () => { calls++; throw new Error("unexpected network call"); } });
  await assert.rejects(store.getJson("generated/ai/schedule.json"), /DATA_STORE_TOKEN não configurado/);
  assert.equal(calls, 0);
});

test("data store fails clearly for either missing repository token or repository name", async () => {
  for (const missingConfig of [
    { DATA_STORE_REPO: "owner/private-data" },
    { DATA_STORE_TOKEN: "test-token-not-a-real-secret" }
  ]) {
    let calls = 0;
    const store = createGitHubJsonStore({ env: missingConfig, fetchImpl: async () => { calls++; throw new Error("unexpected network call"); } });
    await assert.rejects(store.putJson("generated/ai/schedule.json", []), /DATA_STORE_(TOKEN|REPO) não configurado/);
    assert.equal(calls, 0, "missing configuration must never fall back to local disk or call network");
  }
});

test("data store reads and writes JSON through the injected simulated GitHub transport", async () => {
  let stored = null;
  let calls = 0;
  const store = createGitHubJsonStore({ env, fetchImpl: async (url, options = {}) => {
    calls++;
    assert.match(String(url), /owner\/private-data\/contents\/generated\/ai\/schedule\.json/);
    assert.equal(options.headers.Authorization, `Bearer ${env.DATA_STORE_TOKEN}`);
    if ((options.method || "GET") === "GET") {
      return stored ? okJson({ sha: stored.sha, content: encode(stored.content) }) : okJson({ message: "Not Found" }, 404);
    }
    const body = JSON.parse(options.body);
    stored = { sha: "sha-written", content: JSON.parse(Buffer.from(body.content, "base64").toString("utf8")) };
    return okJson({ content: { sha: stored.sha }, commit: { sha: "commit-test" } }, 201);
  } });
  const absent = await store.getJson("generated/ai/schedule.json");
  assert.equal(absent.exists, false);
  await store.putJson("generated/ai/schedule.json", [{ id: "test-item" }]);
  const readBack = await store.getJson("generated/ai/schedule.json");
  assert.deepEqual(readBack.content, [{ id: "test-item" }]);
  assert.ok(calls >= 3);
});

test("data store retries a stale SHA only when current content is unchanged", async () => {
  let putCount = 0;
  let getCount = 0;
  const store = createGitHubJsonStore({ env, maxConflictRetries: 1, fetchImpl: async (_url, options = {}) => {
    if ((options.method || "GET") === "GET") {
      getCount++;
      return okJson({ sha: getCount === 1 ? "sha-old" : "sha-refreshed", content: encode({ safe: true }) });
    }
    putCount++;
    if (putCount === 1) return okJson({ message: "sha mismatch" }, 409);
    return okJson({ content: { sha: "sha-final" } }, 200);
  } });
  const current = await store.getJson("generated/ai/state.json");
  await store.putJson("generated/ai/state.json", { safe: true, updated: true }, current.sha);
  assert.equal(putCount, 2);
});

test("data store does not overwrite concurrent changes after a SHA conflict", async () => {
  let putCount = 0;
  let getCount = 0;
  const store = createGitHubJsonStore({ env, maxConflictRetries: 2, fetchImpl: async (_url, options = {}) => {
    if ((options.method || "GET") === "GET") {
      getCount++;
      const content = getCount === 1 ? { items: ["before"] } : { items: ["before", "concurrent"] };
      return okJson({ sha: getCount === 1 ? "sha-old" : "sha-new", content: encode(content) });
    }
    putCount++;
    return okJson({ message: "sha mismatch" }, 409);
  } });
  const current = await store.getJson("generated/ai/schedule.json");
  await assert.rejects(store.putJson("generated/ai/schedule.json", { items: ["before", "ours"] }, current.sha), /DATA_STORE_WRITE_CONFLICT.*nenhuma alteração foi sobrescrita/);
  assert.equal(putCount, 1);
});
