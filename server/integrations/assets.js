const GH_API = "https://api.github.com";

function repoParts(repo) {
  const [owner, name] = String(repo || "").split("/");
  if (!owner || !name) throw new Error("CONTENT_ASSET_REPO inválido. Use owner/repo.");
  return { owner, name };
}

export async function githubJsonGet(path) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN não configurado.");
  const repo = process.env.CONTENT_ASSET_REPO || "iinteligenci/dorn";
  const { owner, name } = repoParts(repo);
  const response = await fetch(`${GH_API}/repos/${owner}/${name}/contents/${path}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2026-03-10" }
  });
  if (response.status === 404) return { exists: false, content: null, sha: null };
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `GitHub read failed: ${response.status}`);
  const decoded = Buffer.from(data.content || "", "base64").toString("utf8");
  return { exists: true, content: JSON.parse(decoded), sha: data.sha };
}

export async function githubJsonPut(path, value, sha = undefined) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN não configurado.");
  const repo = process.env.CONTENT_ASSET_REPO || "iinteligenci/dorn";
  const { owner, name } = repoParts(repo);
  const body = {
    message: `Dornelas IA: atualizar ${path}`,
    content: Buffer.from(JSON.stringify(value, null, 2)).toString("base64"),
    branch: process.env.CONTENT_ASSET_BRANCH || "main"
  };
  if (sha) body.sha = sha;
  const response = await fetch(`${GH_API}/repos/${owner}/${name}/contents/${path}`, {
    method: "PUT",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2026-03-10", "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `GitHub write failed: ${response.status}`);
  return data;
}

export async function publishPublicAsset({ base64, filename, mimeType = "image/png" }) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.CONTENT_ASSET_REPO || "iinteligenci/dorn";
  if (!token) return { published: false, reason: "GITHUB_TOKEN não configurado.", dataUrl: `data:${mimeType};base64,${base64}` };
  const { owner, name } = repoParts(repo);
  const path = `generated/ai/${Date.now()}-${String(filename).replace(/[^a-zA-Z0-9._-]/g,"_")}`;
  const response = await fetch(`${GH_API}/repos/${owner}/${name}/contents/${path}`, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2026-03-10",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `Dornelas IA: gerar ativo ${path}`,
      content: base64,
      branch: process.env.CONTENT_ASSET_BRANCH || "main"
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `GitHub asset upload failed: ${response.status}`);
  const base = process.env.CONTENT_ASSET_BASE_URL || `https://iinteligenci.github.io/dorn/`;
  const publicUrl = base.replace(/\/$/,"/") + path;
  return { published: true, publicUrl, path, commit: data.commit?.sha || null };
}
