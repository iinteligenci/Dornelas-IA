const OUTCOMES = new Set(["achieved", "partially_achieved", "not_achieved", "unclear"]);
function parseJson(text) {
  const raw = String(text || "").trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/, "");
  try { return JSON.parse(raw); } catch {
    const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("BRAIN_INVALID_EVALUATION_JSON");
    return JSON.parse(raw.slice(start, end + 1));
  }
}
function boundedStrings(value, maxItems = 8, maxLength = 600) {
  return Array.isArray(value) ? value.map(item => String(item || "").trim().slice(0, maxLength)).filter(Boolean).slice(0, maxItems) : [];
}
function normalizeEvaluation(value, input) {
  if (!value || typeof value !== "object") throw new Error("BRAIN_INVALID_EVALUATION");
  const outcome = OUTCOMES.has(value.outcome) ? value.outcome : "unclear";
  const lessonsCandidates = Array.isArray(value.lessonsCandidates) ? value.lessonsCandidates.slice(0, 4).filter(item =>
    item && typeof item.content === "string" && item.content.trim()
  ).map(item => ({
    type: "lesson",
    content: item.content.trim().slice(0, 1200),
    tags: Array.isArray(item.tags) ? item.tags.map(tag => String(tag).slice(0, 40)).slice(0, 8) : ["avaliacao"],
    importance: Math.max(1, Math.min(5, Number(item.importance) || 3))
  })) : [];
  return {
    objective: input.objective,
    outcome,
    summary: String(value.summary || "").trim().slice(0, 1200),
    evidenceProvided: boundedStrings(input.evidence, 12, 1000),
    interpretations: boundedStrings(value.interpretations, 8, 500),
    gaps: boundedStrings(value.gaps, 8, 500),
    lessonsCandidates,
    nextSteps: boundedStrings(value.nextSteps, 6, 700),
    confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0)),
    evaluationMode: "evidence_review_only",
    createdAt: new Date().toISOString()
  };
}
export function createEvaluator({ generate } = {}) {
  if (typeof generate !== "function") throw new Error("BRAIN_GENERATOR_REQUIRED");
  return {
    async evaluate({ objective, expectedResult = "", actualResult, evidence = [], context = {}, memories = [] } = {}) {
      const goal = String(objective || "").trim();
      const actual = String(actualResult || "").trim();
      if (!goal || !actual) throw new Error("BRAIN_EVALUATION_INPUT_REQUIRED");
      const suppliedEvidence = Array.isArray(evidence) ? evidence.map(item => String(item || "").trim()).filter(Boolean).slice(0, 12) : [];
      const payload = {
        objective: goal.slice(0, 1000),
        expectedResult: String(expectedResult || "").trim().slice(0, 1500),
        actualResult: actual.slice(0, 3000),
        evidence: suppliedEvidence.map(item => item.slice(0, 1000)),
        context,
        relevantMemories: memories,
        rules: [
          "Compare objective, expected result, actual result and evidence without inventing facts.",
          "If evidence is absent or insufficient, outcome must be unclear or confidence must remain low.",
          "Do not repeat or invent evidence. Return interpretations separately from the evidence supplied by the user.",
          "Suggest at most four durable lessons; do not save them. They require explicit human confirmation.",
          "Do not turn the evaluation into a claim of success merely because the task was attempted.",
          "Do not execute actions or change external systems.",
          "Return only JSON with outcome, summary, interpretations, gaps, lessonsCandidates, nextSteps and confidence. The application will attach the exact evidence supplied by the user separately.",
          "outcome must be achieved, partially_achieved, not_achieved or unclear."
        ]
      };
      const result = await generate({
        instructions: "Você é o avaliador de resultados da Semente. Avalie com rigor, humildade epistêmica e rastreabilidade. Não confunda atividade com resultado.",
        input: JSON.stringify(payload).slice(0, 18000)
      });
      return normalizeEvaluation(parseJson(result?.text ?? result), { objective: goal, evidence: suppliedEvidence });
    }
  };
}
