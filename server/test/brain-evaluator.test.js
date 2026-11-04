import test from "node:test";
import assert from "node:assert/strict";
import { createEvaluator } from "../brain/evaluator.js";

test("evaluator compares intended and actual outcomes without saving lessons", async () => {
  let payload;
  const evaluator = createEvaluator({ generate: async input => {
    payload = input;
    return { text: JSON.stringify({
      outcome: "partially_achieved",
      summary: "O resultado avançou, mas não atingiu todo o critério.",
      evidenceReviewed: ["O teste foi executado em ambiente local."],
      gaps: ["Ainda falta validação com usuários."],
      lessonsCandidates: [{ content: "Validar com usuários antes de ampliar.", tags: ["validacao"], importance: 4 }],
      nextSteps: ["Executar teste com três usuários."],
      confidence: 0.82
    }) };
  }});
  const result = await evaluator.evaluate({
    objective: "Validar o index",
    expectedResult: "Conseguir conversar",
    actualResult: "O formulário envia mensagens no teste local",
    evidence: ["Teste automatizado passou"]
  });
  assert.match(payload.instructions, /avaliador de resultados/);
  assert.equal(result.outcome, "partially_achieved");
  assert.equal(result.evaluationMode, "evidence_review_only");
  assert.equal(result.lessonsCandidates.length, 1);
  assert.equal(result.lessonsCandidates[0].type, "lesson");
  assert.equal(result.nextSteps[0], "Executar teste com três usuários.");
});

test("evaluator requires an objective and an actual result", async () => {
  const evaluator = createEvaluator({ generate: async () => ({ text: "{}" }) });
  await assert.rejects(evaluator.evaluate({ objective: "Objetivo" }), /BRAIN_EVALUATION_INPUT_REQUIRED/);
  await assert.rejects(evaluator.evaluate({ actualResult: "Resultado" }), /BRAIN_EVALUATION_INPUT_REQUIRED/);
});

test("evaluator downgrades unknown model outcomes to unclear and bounds output", async () => {
  const evaluator = createEvaluator({ generate: async () => ({ text: JSON.stringify({
    outcome: "success",
    summary: "Sem evidência suficiente",
    evidenceReviewed: ["x".repeat(900)],
    lessonsCandidates: Array.from({ length: 8 }, (_, i) => ({ content: "Lição " + i }))
  }) }) });
  const result = await evaluator.evaluate({ objective: "Objetivo", actualResult: "Resultado" });
  assert.equal(result.outcome, "unclear");
  assert.equal(result.evidenceReviewed[0].length, 500);
  assert.equal(result.lessonsCandidates.length, 4);
});
