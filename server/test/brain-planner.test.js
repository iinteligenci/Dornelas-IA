import test from "node:test";
import assert from "node:assert/strict";
import { createPlanner } from "../brain/planner.js";
test("planner returns a bounded plan without executing actions", async () => {
  const planner = createPlanner({ generate: async () => ({ text: JSON.stringify({ objective: "Validar uma ideia", summary: "Plano seguro", steps: [
    { title: "Pesquisar", action: "Levantar evidências", risk: "low" },
    { title: "Publicar", action: "Publicar campanha", risk: "high" }
  ] }) }) });
  const plan = await planner.plan({ objective: "Validar uma ideia" });
  assert.equal(plan.executionMode, "plan_only");
  assert.equal(plan.steps[0].requiresApproval, false);
  assert.equal(plan.steps[1].requiresApproval, true);
});
test("planner treats unknown risk as medium and requires approval", async () => {
  const planner = createPlanner({ generate: async () => ({ text: '{"steps":[{"title":"Ação externa","action":"Enviar mensagem","risk":"unknown"}]}' }) });
  const plan = await planner.plan({ objective: "Objetivo" });
  assert.equal(plan.steps[0].risk, "medium");
  assert.equal(plan.steps[0].requiresApproval, true);
});
test("planner rejects malformed model output", async () => {
  const planner = createPlanner({ generate: async () => ({ text: "não é JSON" }) });
  await assert.rejects(planner.plan({ objective: "Teste" }));
});

test("planner forces approval for external actions even when model marks them low risk", async () => {
  const planner = createPlanner({ generate: async () => ({ text: '{"steps":[{"title":"Publicar campanha","action":"Publicar no Instagram","risk":"low"}]}' }) });
  const plan = await planner.plan({ objective: "Divulgar campanha" });
  assert.equal(plan.steps[0].risk, "low");
  assert.equal(plan.steps[0].requiresApproval, true);
});
