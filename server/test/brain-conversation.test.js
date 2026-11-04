import test from "node:test";
import assert from "node:assert/strict";
import { createConversationService } from "../brain/conversation.js";

test("conversation uses retrieved memories and returns explicit memory suggestions", async () => {
  let received;
  const memory = { search: async () => [{ id: "m1", type: "decision", content: "Priorizar o cérebro", score: 1 }] };
  const service = createConversationService({
    memory,
    generate: async input => {
      received = input;
      return { model: "test-model", text: JSON.stringify({ response: "Vamos priorizar o cérebro.", basis: [{ kind: "fact", content: "Há uma decisão anterior registrada." }, { kind: "private_chain", content: "não deve aparecer" }], memoryCandidates: [{ type: "decision", content: "Priorizar o cérebro", tags: ["roadmap"], importance: 4 }, { type: "secret", content: "invalid" }] }) };
    }
  });
  const result = await service.respond({ message: "Qual é a prioridade?", history: [{ role: "user", content: "Contexto anterior" }] });
  assert.match(received.instructions, /Você é Semente/);
  assert.match(received.input, /Priorizar o cérebro/);
  assert.equal(result.response, "Vamos priorizar o cérebro.");
  assert.equal(result.memoryContext[0].id, "m1");
  assert.equal(result.memoryCandidates.length, 1);
  assert.deepEqual(result.basis, [{ kind: "fact", content: "Há uma decisão anterior registrada." }]);
  assert.equal(result.memoryStatus, "available");
  assert.equal(result.model, "test-model");
});

test("conversation rejects empty messages and accepts plain text fallback", async () => {
  const service = createConversationService({ memory: { search: async () => [] }, generate: async () => ({ text: "Resposta direta." }) });
  await assert.rejects(service.respond({ message: " " }), /SEMENTE_MESSAGE_REQUIRED/);
  const result = await service.respond({ message: "Olá" });
  assert.equal(result.response, "Resposta direta.");
  assert.deepEqual(result.memoryCandidates, []);
});

test("conversation remains useful when memory storage is unavailable and reports the limitation", async () => {
  const service = createConversationService({
    memory: { search: async () => { throw new Error("DATA_STORE_TOKEN ausente"); } },
    generate: async () => ({ text: JSON.stringify({ response: "Posso continuar sem recuperar memórias.", basis: [{ kind: "unknown", content: "Não há memória disponível nesta sessão." }] }) })
  });
  const result = await service.respond({ message: "Vamos conversar" });
  assert.equal(result.memoryStatus, "unavailable");
  assert.match(result.memoryError, /DATA_STORE_TOKEN/);
  assert.equal(result.memoryContext.length, 0);
  assert.equal(result.basis[0].kind, "unknown");
});
