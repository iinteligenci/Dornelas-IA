const MEMORY_VERSION = 1;
const ALLOWED_TYPES = new Set(["fact", "preference", "decision", "lesson", "project", "event"]);
function cleanText(value, max = 2000) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}
function normalizeEntry(input, now) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("MEMORY_INVALID_ENTRY");
  const type = cleanText(input.type, 30);
  const content = cleanText(input.content);
  if (!ALLOWED_TYPES.has(type)) throw new Error("MEMORY_INVALID_TYPE");
  if (!content) throw new Error("MEMORY_EMPTY_CONTENT");
  const tags = Array.isArray(input.tags) ? [...new Set(input.tags.map(tag => cleanText(tag, 40).toLowerCase()).filter(Boolean))].slice(0, 12) : [];
  return { id: cleanText(input.id, 100) || undefined, type, content, project: cleanText(input.project, 80) || "semente", tags, importance: Math.max(1, Math.min(5, Number(input.importance) || 3)), createdAt: cleanText(input.createdAt, 40) || now().toISOString() };
}
function terms(value) {
  return new Set(cleanText(value, 500).toLocaleLowerCase("pt-BR").split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 2));
}
export function createMemoryService({ store, path = "generated/semente/memory.json", maxEntries = 2000, now = () => new Date() } = {}) {
  if (!store?.getJson || !store?.putJson) throw new Error("MEMORY_STORE_REQUIRED");
  async function read() {
    const saved = await store.getJson(path);
    const data = saved.content && typeof saved.content === "object" ? saved.content : {};
    return { sha: saved.sha || undefined, entries: Array.isArray(data.entries) ? data.entries.filter(item => item && typeof item.content === "string") : [] };
  }
  return {
    async remember(input) {
      const entry = normalizeEntry(input, now);
      const current = await read();
      if (entry.id && current.entries.some(item => item.id === entry.id)) return { saved: false, duplicate: true, entry: current.entries.find(item => item.id === entry.id) };
      entry.id ||= "mem_" + now().getTime().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
      const entries = [...current.entries, entry].slice(-Math.max(1, maxEntries));
      await store.putJson(path, { version: MEMORY_VERSION, updatedAt: now().toISOString(), entries }, current.sha);
      return { saved: true, duplicate: false, entry };
    },
    async list({ project, type, limit = 100 } = {}) {
      const { entries } = await read();
      return entries.filter(item => (!project || item.project === project) && (!type || item.type === type))
        .slice(-Math.max(1, Math.min(500, Number(limit) || 100))).reverse();
    },
    async search(query, { project, limit = 20 } = {}) {
      const queryTerms = terms(query);
      if (!queryTerms.size) return [];
      const { entries } = await read();
      return entries.filter(item => !project || item.project === project).map(item => {
        const haystack = terms([item.content, item.type, item.project, ...(item.tags || [])].join(" "));
        const overlap = [...queryTerms].filter(term => haystack.has(term)).length;
        return { ...item, score: overlap / queryTerms.size + (Number(item.importance) || 3) * 0.01 };
      }).filter(item => item.score > 0.01)
        .sort((a, b) => b.score - a.score || String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, Math.max(1, Math.min(100, Number(limit) || 20)));
    }
  };
}
