const OPENAI_URL = "https://api.openai.com/v1/responses";

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

export async function runAI({ instructions, input, model = process.env.AI_MODEL || "gpt-5.6-luna" }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY não configurada no servidor.");
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      reasoning: { effort: process.env.AI_REASONING_EFFORT || "medium" },
      instructions,
      input
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Falha ao consultar a IA.");
  return { text: extractText(data), model: data.model || model, responseId: data.id || null };
}
