function providerConfig() {
  const key = process.env.AI_API_KEY;
  const base = (process.env.AI_API_BASE_URL || "").replace(/\\/+$/, "");
  if (!key || !base) {
    throw new Error("Configure AI_API_KEY e AI_API_BASE_URL no ambiente do servidor.");
  }
  return { key, base };
}

function toChatMessages(instructions, input) {
  const messages = [{ role: "system", content: String(instructions || "Você é um assistente útil.") }];
  if (typeof input === "string") {
    messages.push({ role: "user", content: input });
    return messages;
  }
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

export async function runAI({ instructions, input, model = process.env.AI_MODEL, tools = undefined }) {
  const { key, base } = providerConfig();
  if (!model) throw new Error("Configure AI_MODEL no ambiente do servidor.");
  const body = {
    model,
    messages: toChatMessages(instructions, input),
    temperature: Number(process.env.AI_TEMPERATURE || 0.3)
  };
  if (tools?.length) body.tools = tools;
  const response = await fetch(base + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Number(process.env.AI_REQUEST_TIMEOUT_MS || 60000))
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Falha no provedor de IA (HTTP " + response.status + ").");
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("O provedor de IA não retornou texto.");
  return { text: text.trim(), model: data.model || model, responseId: data.id || null, raw: data };
}

export async function generateImage({ prompt, model = process.env.AI_IMAGE_MODEL, size = "1024x1024" }) {
  const { key, base } = providerConfig();
  if (!model) throw new Error("Geração de imagem não configurada: defina AI_IMAGE_MODEL.");
  const response = await fetch(base + "/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({ model, prompt, size, n: 1 }),
    signal: AbortSignal.timeout(Number(process.env.AI_REQUEST_TIMEOUT_MS || 60000))
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Falha na geração de imagem (HTTP " + response.status + ").");
  const item = data?.data?.[0];
  if (!item?.b64_json) throw new Error("O provedor não retornou imagem em base64.");
  return { b64: item.b64_json, model: data.model || model };
}
