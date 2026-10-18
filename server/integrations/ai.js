function providerConfig({ allowGemini = true } = {}) {
  if (allowGemini && process.env.GEMINI_API_KEY) {
    return {
      key: process.env.GEMINI_API_KEY,
      base: (process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\\/+$/, ""),
      provider: "gemini"
    };
  }
  const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const base = (process.env.AI_API_BASE_URL || (process.env.OPENAI_API_KEY ? "https://api.openai.com/v1" : "")).replace(/\\/+$/, "");
  if (!key || !base) throw new Error("Configure GEMINI_API_KEY (opção gratuita, sujeita aos limites do Google AI Studio) ou uma chave de API compatível em AI_API_KEY/OPENAI_API_KEY.");
  return { key, base, provider: "openai-compatible" };
}
function toChatMessages(instructions, input) {
  const messages = [{ role: "system", content: String(instructions || "Você é um assistente útil.") }];
  if (typeof input === "string") return [...messages, { role: "user", content: input }];
  if (Array.isArray(input)) {
    for (const item of input) {
      const role = item?.role === "assistant" ? "assistant" : "user";
      const parts = Array.isArray(item?.content) ? item.content : [];
      const content = parts.map(part => {
        if (part?.type === "input_text" || part?.type === "text") return { type: "text", text: String(part.text || "") };
        if (part?.type === "input_image" && part.image_url) return { type: "image_url", image_url: { url: part.image_url } };
        return null;
      }).filter(Boolean);
      messages.push({ role, content: content.length ? content : JSON.stringify(item) });
    }
    return messages;
  }
  messages.push({ role: "user", content: JSON.stringify(input ?? {}) });
  return messages;
}
export async function runAI({ instructions, input, model = process.env.GEMINI_MODEL || process.env.AI_MODEL, tools = undefined }) {
  const { key, base } = providerConfig();
  if (!model) throw new Error("Configure GEMINI_MODEL (recomendado) ou AI_MODEL no ambiente do servidor.");
  const body = { model, messages: toChatMessages(instructions, input), temperature: Number(process.env.AI_TEMPERATURE || 0.3) };
  // Tool schemas are not compatible across all OpenAI-compatible gateways. Avoid sending unsupported web_search tools to Gemini's compatibility endpoint.
  if (tools?.length && process.env.AI_ENABLE_TOOLS === "true") body.tools = tools;
  const response = await fetch(base + "/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify(body), signal: AbortSignal.timeout(Number(process.env.AI_REQUEST_TIMEOUT_MS || 60000))
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Falha no provedor de IA (HTTP " + response.status + ").");
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("O provedor de IA não retornou texto.");
  return { text: text.trim(), model: data.model || model, responseId: data.id || null, raw: data };
}
export async function generateImage({ prompt, model = process.env.AI_IMAGE_MODEL, size = "1024x1024" }) {
  const { key, base } = providerConfig({ allowGemini: false });
  if (!model) throw new Error("Geração de imagem não configurada: defina AI_IMAGE_MODEL.");
  const response = await fetch(base + "/images/generations", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({ model, prompt, size, n: 1 }),
    signal: AbortSignal.timeout(Number(process.env.AI_REQUEST_TIMEOUT_MS || 60000))
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Falha na geração de imagem (HTTP " + response.status + ").");
  const item = data?.data?.[0];
  if (!item?.b64_json) throw new Error("O provedor não retornou imagem em base64.");
  return { b64: item.b64_json, model: data.model || model };
}
