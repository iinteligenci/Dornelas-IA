const GH_API = "https://api.github.com";
const API_VERSION = "2022-11-28";

function repoParts(repo) {
  const [owner, name, ...extra] = String(repo || "").split("/");
  if (!owner || !name || extra.length) throw new Error("DATA_STORE_REPO inválido. Use owner/repo para um repositório privado de dados.");
  return { owner, name };
}

function equalJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function createGitHubJsonStore({ env = process.env, fetchImpl = fetch, maxConflictRetries = 2 } = {}) {
  const cache = new Map();
  function config() {
    const token = env.DATA_STORE_TOKEN;
    if (!token) throw new Error("DATA_STORE_TOKEN não configurado.");
    const repo = env.DATA_STORE_REPO;
    if (!repo) throw new Error("DATA_STORE_REPO não configurado. Configure um repositório privado exclusivo para dados.");
    return { token, ...repoParts(repo), branch: env.DATA_STORE_BRANCH || "main" };
  }
  function fileUrl(owner, name, path) {
    const safePath = String(path).split("/").map(encodeURIComponent).join("/");
    return `${GH_API}/repos/${owner}/${name}/contents/${safePath}`;
  }
  async function getJson(path) {
    const cfg = config();
    const response = await fetchImpl(fileUrl(cfg.owner, cfg.name, path), {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${cfg.token}`, "X-GitHub-Api-Version": API_VERSION }
    });
    if (response.status === 404) {
      const result = { exists: false, content: null, sha: null };
      cache.set(path, { ...result });
      return result;
    }
    let data;
    try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) throw new Error(`DATA_STORE_READ_FAILED (${response.status}): ${data?.message || "falha ao ler JSON do repositório de dados."}`);
    let content;
    try { content = JSON.parse(Buffer.from(data.content || "", "base64").toString("utf8")); }
    catch { throw new Error(`DATA_STORE_INVALID_JSON: o arquivo ${path} não contém JSON válido.`); }
    const result = { exists: true, content, sha: data.sha };
    cache.set(path, { ...result });
    return result;
  }
  async function putJson(path, value, expectedSha = undefined) {
    const cfg = config();
    const baseline = cache.get(path) || (expectedSha ? null : { exists: false, content: null, sha: null });
    if (expectedSha && baseline?.sha && baseline.sha !== expectedSha) {
      throw new Error(`DATA_STORE_WRITE_CONFLICT: a versão local de ${path} está desatualizada; releia antes de gravar.`);
    }
    let sha = expectedSha;
    for (let attempt = 0; ; attempt += 1) {
      const body = {
        message: `Dornelas IA: atualizar ${path}`,
        content: Buffer.from(JSON.stringify(value, null, 2)).toString("base64"),
        branch: cfg.branch,
        ...(sha ? { sha } : {})
      };
      const response = await fetchImpl(fileUrl(cfg.owner, cfg.name, path), {
        method: "PUT",
        headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${cfg.token}`, "X-GitHub-Api-Version": API_VERSION, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      let data;
      try { data = await response.json(); } catch { data = {}; }
      if (response.ok) {
        const result = { exists: true, content: value, sha: data.content?.sha || data.commit?.sha || null };
        cache.set(path, { ...result });
        return data;
      }
      const isConflict = response.status === 409 || response.status === 422;
      if (!isConflict) throw new Error(`DATA_STORE_WRITE_FAILED (${response.status}): ${data?.message || "falha ao gravar JSON no repositório de dados."}`);
      if (attempt >= maxConflictRetries) throw new Error(`DATA_STORE_WRITE_CONFLICT: não foi possível gravar ${path} após ${attempt + 1} tentativas; os dados existentes foram preservados.`);
      const latest = await getJson(path);
      const safeBaseline = baseline || { exists: Boolean(expectedSha), content: undefined };
      if (latest.exists !== safeBaseline.exists || !equalJson(latest.content, safeBaseline.content)) {
        throw new Error(`DATA_STORE_WRITE_CONFLICT: ${path} foi alterado por outra gravação; nenhuma alteração foi sobrescrita. Releia e tente novamente.`);
      }
      sha = latest.sha || undefined;
    }
  }
  return { getJson, putJson };
}

const defaultStore = createGitHubJsonStore();
export const githubJsonGet = path => defaultStore.getJson(path);
export const githubJsonPut = (path, value, sha) => defaultStore.putJson(path, value, sha);
