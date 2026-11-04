const MAX_STEPS = 8;
const RISK_LEVELS = new Set(["low", "medium", "high"]);
const EXTERNAL_ACTION = /\b(publish|publicar|send|enviar|delete|excluir|apagar|pagar|transferir|postar|agendar|upload|alterar|modificar|comprar|contratar)\b/i;
function parseJson(text) {
  const raw = String(text || "").trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/, "");
  try { return JSON.parse(raw); } catch {
    const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("BRAIN_INVALID_PLAN_JSON");
    return JSON.parse(raw.slice(start, end + 1));
  }
}
function normalizePlan(value, objective) {
  if (!value || typeof value !== "object" || !Array.isArray(value.steps)) throw new Error("BRAIN_INVALID_PLAN");
  if (!value.steps.length) throw new Error("BRAIN_INVALID_PLAN");
  const steps = value.steps.slice(0, MAX_STEPS).map((step, index) => {
    const risk = RISK_LEVELS.has(step?.risk) ? step.risk : "medium";
    const title = String(step?.title || "").trim().slice(0, 120);
    const action = String(step?.action || "").trim().slice(0, 1000);
    if (!title || !action) throw new Error("BRAIN_INVALID_PLAN_STEP");
    const requiresApproval = risk !== "low" || step.requiresApproval === true || EXTERNAL_ACTION.test(title + " " + action);
    return { id: String(step.id || ("step_" + (index + 1))).slice(0, 80), title, action, rationale: String(step.rationale || "").trim().slice(0, 500), risk, requiresApproval, status: "proposed" };
  });
  return {
    objective: String(value.objective || objective).trim().slice(0, 500),
    summary: String(value.summary || "").trim().slice(0, 1200),
    assumptions: Array.isArray(value.assumptions) ? value.assumptions.map(x => String(x).slice(0, 300)).slice(0, 10) : [],
    successCriteria: Array.isArray(value.successCriteria) ? value.successCriteria.map(x => String(x).slice(0, 400)).filter(Boolean).slice(0, 8) : [],
    steps,
    executionMode: "plan_only",
    createdAt: new Date().toISOString()
  };
}
export function createPlanner({ generate } = {}) {
  if (typeof generate !== "function") throw new Error("BRAIN_GENERATOR_REQUIRED");
  return {
    async plan({ objective, context = {}, memories = [] } = {}) {
      const goal = String(objective || "").trim();
      if (!goal) throw new Error("BRAIN_OBJECTIVE_REQUIRED");
      const prompt = { objective: goal, context, relevantMemories: memories, constraints: [
        "Produza um plano claro e verificável com no máximo 8 etapas.",
        "Não invente fatos, credenciais, preços, estoque ou resultados.",
        "Não execute ações, não publique, não envie mensagens e não altere sistemas.",
        "Classifique risco como low, medium ou high; ações externas ou irreversíveis nunca são low.",
        "Defina critérios observáveis de sucesso em successCriteria[]. Retorne somente JSON com objective, summary, assumptions, successCriteria e steps[].",
        "Cada etapa deve ter title, action, rationale e risk."
      ] };
      const result = await generate({ instructions: "Você é o núcleo de planejamento da Semente. Transforme objetivos em planos seguros, objetivos e verificáveis.", input: JSON.stringify(prompt).slice(0, 30000) });
      return normalizePlan(parseJson(result?.text ?? result), goal);
    }
  };
}
