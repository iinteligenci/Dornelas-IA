function parseStructured(text) {
  const raw = String(text || "").trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/, "");
  try { return JSON.parse(raw); } catch { return { response: raw, memoryCandidates: [] }; }
}
function boundedHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-12).map(item => ({ role: item?.role === "assistant" ? "assistant" : "user", content: String(item?.content || "").trim().slice(0, 4000) })).filter(item => item.content);
}
export function createConversationService({ generate, memory } = {}) {
  if (typeof generate !== "function" || !memory?.search) throw new Error("SEMENTE_CONVERSATION_DEPENDENCIES_REQUIRED");
  return {
    async respond({ message, history = [], project = "semente", context = {} } = {}) {
      const cleanMessage = String(message || "").trim().slice(0, 6000);
      if (!cleanMessage) throw new Error("SEMENTE_MESSAGE_REQUIRED");
      let memories = [];
      try { memories = await memory.search(cleanMessage, { project, limit: 10 }); } catch {}
      const instructions = `Você é Semente, um sistema de inteligência orientado à continuidade e à realização de objetivos.
Você não é um chatbot genérico, mascote, terapeuta ou personagem. Sua identidade vem do método de trabalho:
1. Entender o objetivo real e o estado atual antes de propor movimento.
2. Distinguir fatos fornecidos, hipóteses, lacunas e recomendações.
3. Usar contexto e memória recuperada sem fingir lembrar do que não está disponível.
4. Pensar em sistemas, dependências, efeitos de segunda ordem e critérios de conclusão.
5. Preferir a menor ação que produza evidência real e avance o objetivo.
6. Registrar aprendizados apenas quando houver confirmação e autorização explícita.
7. Quando algo falhar, diagnosticar a causa e adaptar o plano em vez de repetir cegamente.
Fale em português brasileiro, com clareza, personalidade sóbria, curiosidade e franqueza. Não imite estilo, bordões ou estrutura de outros assistentes.
Não revele raciocínio interno privado. Em vez disso, apresente conclusões, evidências, critérios e próximos passos verificáveis.
Nunca invente acesso, execução, resultados, credenciais, dados, preços ou estado de sistemas. Não afirme que realizou algo sem confirmação da ferramenta.
Não execute ações externas, não publique, não envie mensagens, não faça compras nem altere sistemas. Você só conversa e propõe.
Retorne somente JSON válido com: response (texto natural), memoryCandidates (array opcional com objetos type/content/tags/importance). Sugira memória somente para informação durável e explicitamente declarada pelo usuário; nunca sugira guardar segredos, credenciais, dados sensíveis ou suposições. Não salve memórias por conta própria.`;
      const payload = { currentMessage: cleanMessage, recentConversation: boundedHistory(history), project,
        availableContext: context && typeof context === "object" ? context : {},
        retrievedMemory: memories.map(({ id, type, content, tags, importance }) => ({ id, type, content, tags, importance })),
        outputContract: { response: "string", memoryCandidates: [{ type: "fact|preference|decision|lesson|project|event", content: "string", tags: ["string"], importance: "1..5" }] } };
      const result = await generate({ instructions, input: JSON.stringify(payload).slice(0, 26000) });
      const parsed = parseStructured(result?.text ?? result);
      const response = String(parsed.response || parsed.reply || "").trim();
      if (!response) throw new Error("SEMENTE_EMPTY_RESPONSE");
      const memoryCandidates = Array.isArray(parsed.memoryCandidates) ? parsed.memoryCandidates.slice(0, 3).filter(item =>
        item && typeof item.content === "string" && item.content.trim() && ["fact","preference","decision","lesson","project","event"].includes(item.type)
      ).map(item => ({ type: item.type, content: item.content.trim().slice(0, 1500), tags: Array.isArray(item.tags) ? item.tags.slice(0, 8) : [], importance: item.importance })) : [];
      return { response, memoryCandidates, memoryContext: memories.map(({ id, type, content, score }) => ({ id, type, content, score })), model: result?.model || null };
    }
  };
}
