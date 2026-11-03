import { createMemoryService } from "./memory.js";
import { createPlanner } from "./planner.js";
export function createSementeBrain({ store, generate, memoryOptions = {} } = {}) {
  const memory = createMemoryService({ store, ...memoryOptions });
  const planner = createPlanner({ generate });
  return {
    memory,
    async plan({ objective, context = {}, memoryQuery = objective, project = "semente" } = {}) {
      const memories = await memory.search(memoryQuery, { project, limit: 12 });
      const plan = await planner.plan({ objective, context, memories });
      return { ...plan, memoryContext: memories.map(({ id, type, content, score }) => ({ id, type, content, score })) };
    }
  };
}
