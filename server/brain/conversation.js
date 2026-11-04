import { SEMENTE_CORE_INSTRUCTIONS } from "./identity.js";
function parseStructured(text) {
  const raw = String(text || "").trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/, "");
  try { return JSON.parse(raw); } catch { return { response: raw, basis: [], memoryCandidates: [] }; }
}
function boundedHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-12).map(item => ({
    role: item?.role === "assistant" ? "assistant" : "user",
    content: String(item?.content || "").trim().slice(0, 4000)
  })).filter(item => item.content);
}
function normalizeBasis(value) {
  const allowed = new Set(["fact", "inference", "hypothesis", "unknown", "criterion"]);
  return Array.isArray(value) ? value.slice(0, 8).filter(item =>
    item && allowed.has(item.kind) && typeof item.content === "string" && item.content.trim()
  ).map(item => ({ kind: item.kind, content: item.content.trim().slice(0, 700) })) : [];
}
export function createConversationService({ generate, memory } = {}) {
  if (typeof generate !== "function" || !memory?.search) throw new Error("SEMENTE_CONVERSATION_DEPENDENCIES_REQUIRED");
  return {
    async respond({ message, history = [], project = "semente", context = {} } = {}) {
      const cleanMessage = String(message || "").trim().slice(0, 6000);
      if (!cleanMessage) throw new Error("SEMENTE_MESSAGE_REQUIRED");
      let memories = [];
      let memoryError = null;
      try { memories = await memory.search(cleanMessage, { project, limit: 10 }); }
      catch (error) { memoryError = String(error?.message || "memória indisponível").slice(0, 240); }
      const payload = {
        currentMessage: cleanMessage,
        recentConversation: boundedHistory(history),
        project,
        availableContext: context && typeof context === "object" ? context : {},
        retrievedMemory: memories.map(({ id, type, content, tags, importance }) => ({ id, type, content, tags, importance })),
        outputContract: {
          response: "string",
          basis: [{ kind: "fact|inference|hypothesis|unknown|criterion", content: "string" }],
          memoryCandidates: [{ type: "fact|preference|decision|lesson|project|event", content: "string", tags: ["string"], importance: "1..5" }]
        }
      };
      const result = await generate({ instructions: SEMENTE_CORE_INSTRUCTIONS, input: JSON.stringify(payload).slice(0, 30000) });
      const parsed = parseStructured(result?.text ?? result);
      const response = String(parsed.response || parsed.reply || "").trim();
      if (!response) throw new Error("SEMENTE_EMPTY_RESPONSE");
      const memoryCandidates = Array.isArray(parsed.memoryCandidates) ? parsed.memoryCandidates.slice(0, 3).filter(item =>
        item && typeof item.content === "string" && item.content.trim() &&
        ["fact", "preference", "decision", "lesson", "project", "event"].includes(item.type)
      ).map(item => ({
        type: item.type,
        content: item.content.trim().slice(0, 1500),
        tags: Array.isArray(item.tags) ? item.tags.slice(0, 8).map(tag => String(tag).slice(0, 40)) : [],
        importance: Math.max(1, Math.min(5, Number(item.importance) || 3))
      })) : [];
      return {
        response,
        basis: normalizeBasis(parsed.basis),
        memoryCandidates,
        memoryContext: memories.map(({ id, type, content, score, importance, createdAt }) => ({ id, type, content, score, importance, createdAt })),
        memoryStatus: memoryError ? "unavailable" : "available",
        ...(memoryError ? { memoryError } : {}),
        model: result?.model || null
      };
    }
  };
}
