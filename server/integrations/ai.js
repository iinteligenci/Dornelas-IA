const OPENAI_URL = "https://api.openai.com/v1/responses";
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";

function extractText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  const parts = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && content?.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

export async function runAI({ instructions, input, model = process.env.AI_MODEL || "gpt-6-luna", tools = undefined }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY não configurada no servidor.");
  const body = { model, reasoning: { effort: process.env.AI_REASONING_EFFORT || "medium" }, instructions, input };
  if (tools?.length) body.tools = tools;
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Falha ao consultar a IA.");
  return { text: extractText(data), model: data.model || model, responseId: data.id || null, raw: data };
}

export async function generateImage({ prompt, model = process.env.AI_IMAGE_MODEL || "gpt-image-2", size = "1024x1024" }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY não configurada no servidor.");
  const response = await fetch(OPENAI_IMAGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, prompt, size, n: 1 })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Falha ao gerar a imagem.");
  const item = data?.data?.[0];
  if (!item?.b64_json) throw new Error("A API de imagem não retornou a imagem.");
  return { b64: item.b64_json, model: data.model || model };
}
