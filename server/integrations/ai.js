const DEFAULT_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

function gatewayConfig() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY não configurada no Render. Configure a chave do Lovable AI Gateway.");
  const base = (process.env.LOVABLE_AI_GATEWAY_URL || DEFAULT_GATEWAY_URL).replace(/\/+$/, "");
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
        if (part?.type === "input_text") return { type: "text", text: String(part.text || "") };
        if (part?.type === "input_image" && part.image_url) return { type: "image_url", image_url: { url: part.image_url } };
        if (part?.type === "text") return { type: "text", text: String(part.text || "") };
        return null;
      }).filter(Boolean);
      messages.push({ role, content: content.length ? content : JSON.stringify(item) });
    }
    return messages;
  }
  messages.push({ role: "user", content: JSON.stringify(input ?? {}) });
  return messages;
}

export async function runAI({ instructions, input, model = process.env.AI_MODEL || "google/gemini-2.5-flash", tools = undefined }) {
  const { key, base } = gatewayConfig();
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
  if (!response.ok) throw new Error(data?.error?.message || "Falha no Lovable AI Gateway (HTTP " + response.status + ").");
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("O Lovable AI Gateway não retornou texto.");
  return { text: text.trim(), model: data.model || model, responseId: data.id || null, raw: data };
}

export async function generateImage({ prompt, model = process.env.AI_IMAGE_MODEL, size = "1024x1024" }) {
  const { key, base } = gatewayConfig();
  if (!model) throw new Error("Defina AI_IMAGE_MODEL e confirme que o modelo de imagem está disponível no Lovable AI Gateway.");
  const response = await fetch(base + "/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({ model, prompt, size, n: 1 }),
    signal: AbortSignal.timeout(Number(process.env.AI_REQUEST_TIMEOUT_MS || 60000))
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Falha ao gerar imagem pelo Lovable AI Gateway (HTTP " + response.status + ").");
  const item = data?.data?.[0];
  if (!item?.b64_json) throw new Error("O gateway não retornou imagem em base64; confirme o modelo e o formato de saída suportados.");
  return { b64: item.b64_json, model: data.model || model };
}
