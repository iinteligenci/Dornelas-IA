import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryService } from "../brain/memory.js";
function fakeStore() {
  let content = null, sha = null;
  return {
    async getJson() { return { exists: Boolean(content), content, sha }; },
    async putJson(_path, value, expectedSha) {
      if (expectedSha && expectedSha !== sha) throw new Error("conflict");
      content = structuredClone(value);
      sha = "sha-" + ((Number(String(sha).split("-")[1]) || 0) + 1);
      return { content: { sha } };
    }
  };
}
test("memory stores typed entries and retrieves relevant items", async () => {
  const memory = createMemoryService({ store: fakeStore(), now: () => new Date("2026-11-03T12:00:00.000Z") });
  await memory.remember({ id: "m1", type: "decision", content: "Priorizar o cérebro da Semente", tags: ["roadmap"] });
  await memory.remember({ id: "m2", type: "fact", content: "O projeto usa Node.js" });
  assert.equal((await memory.search("cérebro Semente"))[0].id, "m1");
  assert.equal((await memory.list({ type: "fact" })).length, 1);
});
test("memory rejects invalid entries and avoids duplicate ids", async () => {
  const memory = createMemoryService({ store: fakeStore() });
  await assert.rejects(memory.remember({ type: "unknown", content: "x" }), /MEMORY_INVALID_TYPE/);
  await assert.rejects(memory.remember({ type: "fact", content: " " }), /MEMORY_EMPTY_CONTENT/);
  await memory.remember({ id: "same", type: "fact", content: "Persistir com segurança" });
  assert.equal((await memory.remember({ id: "same", type: "fact", content: "Outra versão" })).duplicate, true);
});
test("memory enforces retention limit", async () => {
  const memory = createMemoryService({ store: fakeStore(), maxEntries: 2 });
  await memory.remember({ type: "fact", content: "um" });
  await memory.remember({ type: "fact", content: "dois" });
  await memory.remember({ type: "fact", content: "três" });
  assert.deepEqual((await memory.list()).map(x => x.content), ["três", "dois"]);
});
