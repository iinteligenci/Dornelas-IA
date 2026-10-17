import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";

const ADMIN_PASSWORD_FOR_TEST = "local-test-password-not-a-real-credential";
const ADMIN_SESSION_SECRET_FOR_TEST = "local-test-session-secret-not-a-real-credential";
let serverProcess;
let baseUrl;
let adminCookie;
let log = "";

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function request(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: response.status, headers: response.headers, text, json };
}

before(async () => {
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  const env = { ...process.env };
  for (const name of [
    "AI_API_BASE_URL", "AI_API_KEY", "AI_MODEL", "AI_IMAGE_MODEL", "GITHUB_TOKEN",
    "CONTENT_ASSET_REPO", "CONTENT_ASSET_BRANCH", "META_ACCESS_TOKEN", "META_CLIENT_SECRET",
    "GOOGLE_CLIENT_SECRET", "INSTAGRAM_CLIENT_SECRET", "SCHEDULER_SECRET", "DORNELAS_SCHEDULER_SECRET"
  ]) delete env[name];
  Object.assign(env, {
    PORT: String(port),
    ADMIN_PASSWORD: ADMIN_PASSWORD_FOR_TEST,
    ADMIN_SESSION_SECRET: ADMIN_SESSION_SECRET_FOR_TEST,
    META_PUBLISH_MODE: "simulate",
    SITE_URL: "http://127.0.0.1:1/",
    NODE_ENV: "test"
  });
  serverProcess = spawn(process.execPath, ["index.js"], { cwd: new URL("..", import.meta.url), env, stdio: ["ignore", "pipe", "pipe"] });
  serverProcess.stdout.on("data", chunk => { log += chunk.toString(); });
  serverProcess.stderr.on("data", chunk => { log += chunk.toString(); });
  const startedAt = Date.now();
  while (Date.now() - startedAt < 8000) {
    if (serverProcess.exitCode !== null) throw new Error(`Backend exited before starting. Output: ${log}`);
    try {
      const response = await fetch(baseUrl + "/health");
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Backend did not become ready. Output: ${log}`);
});

after(async () => {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill("SIGTERM");
    await Promise.race([once(serverProcess, "exit"), new Promise(resolve => setTimeout(resolve, 2000))]);
  }
});

test("GET /health returns JSON without secret values", async () => {
  const response = await request("/health?probe=1");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/i);
  assert.equal(response.json?.ok, true);
  assert.equal(response.json?.service, "dornelas-ia-agent");
  assert.equal(typeof response.json?.version, "string");
  assert.equal(JSON.stringify(response.json).includes(ADMIN_SESSION_SECRET_FOR_TEST), false);
});

test("unknown root route returns JSON 404", async () => {
  const response = await request("/");
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type"), /application\/json/i);
  assert.deepEqual(response.json, { error: "not_found" });
});

test("admin routes reject requests without a session", async () => {
  for (const [method, path, body] of [
    ["POST", "/agent/research", { focus: "test" }],
    ["GET", "/agent/schedule"],
    ["POST", "/agent/scheduler/run", {}],
    ["GET", "/meta/status"],
    ["GET", "/meta/overview"],
    ["GET", "/meta/accounts"],
    ["GET", "/google/status"],
    ["GET", "/site/analyze"],
    ["POST", "/meta/publish", { autonomyLevel: 2, caption: "teste", imageUrl: "https://example.invalid/test.jpg" }]
  ]) {
    const response = await request(path, { method, body });
    assert.equal(response.status, 401, `${method} ${path} should require authentication`);
    assert.equal(response.json?.error, "admin_login_required");
  }
});

test("login rejects incorrect password and issues an HttpOnly session for correct password", async () => {
  const wrong = await request("/auth/login", { method: "POST", body: { password: "wrong" } });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.json?.error, "invalid_password");

  const correct = await request("/auth/login", { method: "POST", body: { password: ADMIN_PASSWORD_FOR_TEST } });
  assert.equal(correct.status, 200);
  const setCookie = correct.headers.get("set-cookie");
  assert.match(setCookie || "", /HttpOnly/i);
  assert.match(setCookie || "", /Secure/i);
  adminCookie = (setCookie || "").split(";")[0];
  assert.match(adminCookie, /^dornelas_admin=/);
});

test("/meta/publish is simulated and explicitly performs no external action", async () => {
  assert.ok(adminCookie, "login test must establish the test session first");
  const response = await request("/meta/publish", {
    method: "POST",
    cookie: adminCookie,
    body: { autonomyLevel: 2, caption: "simulação de teste", mediaType: "IMAGE", imageUrl: "https://example.invalid/test.jpg" }
  });
  assert.equal(response.status, 202);
  assert.equal(response.json?.simulated, true);
  assert.equal(response.json?.externalActionPerformed, false);
  assert.equal(response.json?.ok, false);
  assert.match(response.json?.message || "", /nada foi publicado/i);
});

test("agent routes report missing external configuration rather than inventing results", async () => {
  assert.ok(adminCookie, "login test must establish the test session first");
  const research = await request("/agent/research", { method: "POST", cookie: adminCookie, body: { focus: "teste" } });
  assert.equal(research.status, 502);
  assert.equal(research.json?.error, "research_failed");
  assert.match(research.json?.message || "", /AI_API_KEY|AI_API_BASE_URL/i);

  const contentPlan = await request("/agent/content-plan", { method: "POST", cookie: adminCookie, body: {} });
  assert.equal(contentPlan.status, 502);
  assert.equal(contentPlan.json?.error, "content_plan_failed");

  const schedule = await request("/agent/schedule", { cookie: adminCookie });
  assert.equal(schedule.status, 502);
  assert.equal(schedule.json?.error, "schedule_read_failed");
  assert.match(schedule.json?.message || "", /GITHUB_TOKEN/i);
});

test("image, clip, campaign and scheduler routes fail closed when dependencies or inputs are missing", async () => {
  assert.ok(adminCookie, "login test must establish the test session first");
  const image = await request("/agent/image", { method: "POST", cookie: adminCookie, body: { prompt: "teste" } });
  assert.equal(image.status, 502);
  assert.equal(image.json?.error, "image_generation_failed");
  assert.match(image.json?.message || "", /AI_API_KEY|AI_API_BASE_URL/i);

  const clip = await request("/agent/clip", { method: "POST", cookie: adminCookie, body: {} });
  assert.equal(clip.status, 502);
  assert.equal(clip.json?.error, "clip_failed");
  assert.match(clip.json?.message || "", /sourceUrl/i);

  const campaign = await request("/agent/campaign", { method: "POST", cookie: adminCookie, body: { product: "Bacon" } });
  assert.equal(campaign.status, 502);
  assert.equal(campaign.json?.error, "ai_campaign_failed");
  assert.match(campaign.json?.message || "", /AI_API_KEY|AI_API_BASE_URL/i);

  const scheduleWrite = await request("/agent/schedule", { method: "POST", cookie: adminCookie, body: {} });
  assert.equal(scheduleWrite.status, 502);
  assert.equal(scheduleWrite.json?.error, "schedule_write_failed");
  assert.match(scheduleWrite.json?.message || "", /scheduledFor/i);

  const schedulerRun = await request("/agent/scheduler/run", { method: "POST", cookie: adminCookie, body: {} });
  assert.equal(schedulerRun.status, 502);
  assert.equal(schedulerRun.json?.error, "scheduler_run_failed");
  assert.match(schedulerRun.json?.message || "", /GITHUB_TOKEN/i);
});

test("campaign approval validates human approval but simulates external publication", async () => {
  assert.ok(adminCookie, "login test must establish the test session first");
  const denied = await request("/agent/campaign/approve", { method: "POST", cookie: adminCookie, body: { autonomyLevel: 2, caption: "teste", imageUrl: "https://example.invalid/test.jpg" } });
  assert.equal(denied.status, 502);
  assert.equal(denied.json?.error, "campaign_approval_failed");
  assert.match(denied.json?.message || "", /autorização explícita/i);

  const approved = await request("/agent/campaign/approve", { method: "POST", cookie: adminCookie, body: { approved: true, autonomyLevel: 2, caption: "simulação de campanha", imageUrl: "https://example.invalid/test.jpg" } });
  assert.equal(approved.status, 202);
  assert.equal(approved.json?.simulated, true);
  assert.equal(approved.json?.externalActionPerformed, false);
});

test("public trend research either returns source metadata or an explicit access limitation", async () => {
  assert.ok(adminCookie, "login test must establish the test session first");
  const trends = await request("/agent/trends", { cookie: adminCookie });
  if (trends.status === 200) {
    assert.equal(trends.json?.source, "Google Trends público");
    assert.equal(typeof trends.json?.consultedAt, "string");
    for (const item of trends.json?.trends || []) {
      assert.match(item.url || "", /^https?:\/\//i);
      assert.equal(typeof item.consultedAt, "string");
    }
  } else {
    assert.equal(trends.status, 502);
    assert.equal(trends.json?.error, "trends_failed");
    assert.equal(trends.json?.manualInputAvailable, true);
    assert.deepEqual(trends.json?.manualInputFields, ["sourceUrl", "consultedAt", "performanceSignal"]);
  }
});

test("remaining agent endpoints are reachable and fail honestly without provider credentials", async () => {
  assert.ok(adminCookie, "login test must establish the test session first");
  const cases = [
    ["POST", "/agent/chat", { message: "Crie uma legenda de teste" }, 502, "ai_chat_failed"],
    ["GET", "/agent/sales-kit", undefined, 502, "sales_kit_failed"],
    ["POST", "/agent/analyze", { context: {} }, 502, "ai_analysis_failed"],
    ["POST", "/agent/reuse", { media: [] }, 502, "reuse_failed"],
    ["POST", "/agent/site-improvements", {}, 502, "site_improvements_failed"],
    ["POST", "/agent/knowledge/collect", {}, 502, "knowledge_collection_failed"],
    ["POST", "/agent/self-audit", {}, 200, null],
    ["POST", "/agent/self-fix", {}, 502, "self_fix_failed"],
    ["POST", "/agent/cycle", {}, 200, null],
    ["GET", "/agent/config-audit", undefined, 200, null],
    ["POST", "/agent/ux-test", {}, 200, null],
    ["POST", "/agent/knowledge/test", {}, 200, null]
  ];
  for (const [method, path, body, expectedStatus, expectedError] of cases) {
    const response = await request(path, { method, body, cookie: adminCookie });
    assert.equal(response.status, expectedStatus, `${method} ${path} unexpected status; response=${response.text.slice(0, 200)}`);
    if (expectedError) assert.equal(response.json?.error, expectedError, `${method} ${path}`);
    if (path === "/agent/cycle") assert.equal(response.json?.ai?.enabled, false);
    if (path === "/agent/config-audit") assert.equal(Array.isArray(response.json?.configured), true);
    if (path === "/agent/knowledge/test") assert.ok(response.json?.storageError, "missing GitHub token should be reported rather than persisted");
  }
});
