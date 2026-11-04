import test from "node:test";
import assert from "node:assert/strict";
import { createSementeBrain } from "../brain/index.js";

test("planning and evaluation remain available when optional memory storage is unavailable", async () => {
  const store = {
    async getJson() { throw new Error("DATA_STORE_TOKEN ausente"); },
    async putJson() { throw new Error("DATA_STORE_TOKEN ausente"); }
  };
  const generate = async ({ instructions }) => instructions.includes("avaliador de resultados")
    ? { text: JSON.stringify({ outcome: "unclear", summary: "Sem evidência", gaps: ["Ainda não há dados"] }) }
    : { text: JSON.stringify({ objective: "Testar", summary: "Plano", successCriteria: ["Teste passou"], steps: [{ title: "Executar teste", action: "Rodar suíte", risk: "low" }] }) };
  const brain = createSementeBrain({ store, generate });
  const plan = await brain.plan({ objective: "Testar" });
  assert.equal(plan.memoryStatus, "unavailable");
  assert.equal(plan.executionMode, "plan_only");
  assert.equal(plan.successCriteria[0], "Teste passou");
  const evaluation = await brain.evaluate({ objective: "Testar", actualResult: "Ainda não executado" });
  assert.equal(evaluation.memoryStatus, "unavailable");
  assert.equal(evaluation.outcome, "unclear");
});
