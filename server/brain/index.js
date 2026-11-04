import { createMemoryService } from "./memory.js";
import { createPlanner } from "./planner.js";
import { createEvaluator } from "./evaluator.js";
import { SEMENTE_IDENTITY } from "./identity.js";

export function createSementeBrain({ store, generate, memoryOptions = {} } = {}) {
  const memory = createMemoryService({ store, ...memoryOptions });
  const planner = createPlanner({ generate });
  const evaluator = createEvaluator({ generate });
  return {
    identity: SEMENTE_IDENTITY,
    memory,
    async plan({ objective, context = {}, memoryQuery = objective, project = "semente" } = {}) {
      let memories = [];
      let memoryError = null;
      try { memories = await memory.search(memoryQuery, { project, limit: 12 }); }
      catch (error) { memoryError = String(error?.message || "memória indisponível").slice(0, 240); }
      const plan = await planner.plan({ objective, context, memories });
      return {
        ...plan,
        memoryContext: memories.map(({ id, type, content, score, importance }) => ({ id, type, content, score, importance })),
        memoryStatus: memoryError ? "unavailable" : "available",
        ...(memoryError ? { memoryError } : {})
      };
    },
    async evaluate({ objective, expectedResult = "", actualResult, evidence = [], context = {}, project = "semente" } = {}) {
      let memories = [];
      let memoryError = null;
      try { memories = await memory.search([objective, actualResult].filter(Boolean).join(" "), { project, limit: 10 }); }
      catch (error) { memoryError = String(error?.message || "memória indisponível").slice(0, 240); }
      const result = await evaluator.evaluate({ objective, expectedResult, actualResult, evidence, context, memories });
      return {
        ...result,
        memoryContext: memories.map(({ id, type, content, score, importance }) => ({ id, type, content, score, importance })),
        memoryStatus: memoryError ? "unavailable" : "available",
        ...(memoryError ? { memoryError } : {})
      };
    }
  };
}
