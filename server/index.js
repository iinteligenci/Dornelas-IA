import { runSalesCycle } from "./agent/cycle.js";
import { createOAuthState } from "./security/state.js";
import { metaAuthorizeUrl, exchangeMetaCode, exchangeForLongLivedMetaToken, metaGraphGet } from "./integrations/meta.js";
import { googleAuthorizeUrl, exchangeGoogleCode } from "./integrations/google.js";

const port = Number(process.env.PORT || 8787);

const oauthStates = new Set();
let metaConnection = process.env.META_ACCESS_TOKEN ? { accessToken: process.env.META_ACCESS_TOKEN, expiresAt: null, connected: true } : null;

const demoContext = {
  autonomyLevel: 2,
  products: [
    { name: "Bacon", stock: 10, margin: 0.4, minMargin: 0.3 },
    { name: "Kit Feijoada", stock: 8, margin: 0.45, minMargin: 0.3 }
  ],
  permissions: {
    campaignDraft: { allowed: true, approvalRequired: false }
  }
};

const server = await import("node:http").then(({ createServer }) =>
  createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (req.method === "GET" && req.url === "/auth/meta") {
      const state = createOAuthState(); oauthStates.add(state);
      res.statusCode = 302;
      res.setHeader("Location", metaAuthorizeUrl({ clientId: process.env.META_CLIENT_ID, redirectUri: process.env.META_REDIRECT_URI, state, configId: process.env.META_CONFIG_ID }));
      res.end(); return;
    }

    if (req.method === "GET" && req.url === "/auth/google") {
      const state = createOAuthState(); oauthStates.add(state);
      res.statusCode = 302;
      res.setHeader("Location", googleAuthorizeUrl({ clientId: process.env.GOOGLE_CLIENT_ID, redirectUri: process.env.GOOGLE_REDIRECT_URI, state }));
      res.end(); return;
    }

    if (req.method === "GET" && req.url.startsWith("/auth/meta/callback")) {
      const url = new URL(req.url, "http://localhost");
      const state = url.searchParams.get("state");
      const code = url.searchParams.get("code");
      if (!state || !oauthStates.has(state)) { res.statusCode = 400; res.end(JSON.stringify({ error: "invalid_oauth_state" })); return; }
      oauthStates.delete(state);
      if (!code) { res.statusCode = 400; res.end(JSON.stringify({ error: "missing_code" })); return; }
      try {
        const token = await exchangeMetaCode({ clientId: process.env.META_CLIENT_ID, clientSecret: process.env.META_CLIENT_SECRET, redirectUri: process.env.META_REDIRECT_URI, code });
        if (!token?.access_token) throw new Error("Meta did not return an access token");

        const longLived = await exchangeForLongLivedMetaToken({
          clientId: process.env.META_CLIENT_ID,
          clientSecret: process.env.META_CLIENT_SECRET,
          accessToken: token.access_token
        });

        metaConnection = {
          accessToken: longLived.access_token || token.access_token,
          expiresAt: longLived.expires_in ? Date.now() + Number(longLived.expires_in) * 1000 : null,
          connected: true
        };

        let accounts = [];
        try {
          const result = await metaGraphGet({
            path: "/me/accounts",
            accessToken: metaConnection.accessToken,
            params: { fields: "id,name,instagram_business_account" }
          });
          accounts = result.data || [];
        } catch (accountError) {
          console.error("Meta accounts lookup failed:", accountError.message);
        }

        res.end(JSON.stringify({
          ok: true,
          provider: "meta",
          connected: true,
          token_received: true,
          long_lived_token_received: Boolean(longLived?.access_token),
          expires_in: longLived?.expires_in || null,
          accounts
        }));
      } catch (error) {
        res.statusCode = 502; res.end(JSON.stringify({ error: "oauth_exchange_failed" }));
      }
      return;
    }

    if (req.method === "GET" && req.url.startsWith("/auth/google/callback")) {
      const url = new URL(req.url, "http://localhost");
      const state = url.searchParams.get("state");
      if (!state || !oauthStates.has(state)) { res.statusCode = 400; res.end(JSON.stringify({ error: "invalid_oauth_state" })); return; }
      oauthStates.delete(state);
      const code = url.searchParams.get("code");
      if (!code) { res.statusCode = 400; res.end(JSON.stringify({ error: "missing_code" })); return; }
      try {
        const token = await exchangeGoogleCode({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, redirectUri: process.env.GOOGLE_REDIRECT_URI, code });
        res.end(JSON.stringify({ ok: true, provider: "google", connected: true, token_received: Boolean(token?.access_token), refresh_token_received: Boolean(token?.refresh_token) }));
      } catch (error) {
        res.statusCode = 502; res.end(JSON.stringify({ error: "oauth_exchange_failed" }));
      }
      return;
    }

    if (req.method === "GET" && req.url === "/meta/status") {
      res.end(JSON.stringify({
        connected: Boolean(metaConnection?.accessToken),
        expiresAt: metaConnection?.expiresAt || null
      }));
      return;
    }

    if (req.method === "GET" && req.url === "/meta/accounts") {
      if (!metaConnection?.accessToken) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: "meta_not_connected" }));
        return;
      }
      try {
        const result = await metaGraphGet({
          path: "/me/accounts",
          accessToken: metaConnection.accessToken,
          params: { fields: "id,name,instagram_business_account" }
        });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.statusCode = 502;
        res.end(JSON.stringify({ error: "meta_graph_failed", message: error.message }));
      }
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      res.end(JSON.stringify({ ok: true, service: "dornelas-ia-agent" }));
      return;
    }

    if (req.method === "POST" && req.url === "/agent/cycle") {
      const result = await runSalesCycle(demoContext);
      res.end(JSON.stringify(result));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not_found" }));
  })
);

server.listen(port, "0.0.0.0", () => {
  console.log(`Dornelas IA backend listening on :${port}`);
});
