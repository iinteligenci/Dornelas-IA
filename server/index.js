import { runSalesCycle } from "./agent/cycle.js";
import { createOAuthState } from "./security/state.js";
import { metaAuthorizeUrl, exchangeMetaCode, exchangeForLongLivedMetaToken, metaGraphGet, metaGraphPost } from "./integrations/meta.js";
import { googleAuthorizeUrl, exchangeGoogleCode, googleApiGet } from "./integrations/google.js";
import crypto from "node:crypto";
import { runAI } from "./integrations/ai.js";
import { SYSTEM_PROMPT, CAMPAIGN_PROMPT } from "./agent/ai-prompts.js";

function cookieToken(secret, value) {
  const key = crypto.createHash("sha256").update(String(secret || "")).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  const part = raw.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
}

function decryptCookie(secret, value) {
  try {
    const key = crypto.createHash("sha256").update(String(secret || "")).digest();
    const data = Buffer.from(value, "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    return decipher.update(data.subarray(28), undefined, "utf8") + decipher.final("utf8");
  } catch { return null; }
}

const port = Number(process.env.PORT || 8787);

const oauthStates = new Set();
let metaConnection = process.env.META_ACCESS_TOKEN ? { accessToken: process.env.META_ACCESS_TOKEN, expiresAt: null, connected: true } : null;
let googleConnection = null;

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

function readBody(req) { return new Promise(async (resolve) => { let body=""; for await (const chunk of req) body+=chunk; resolve(body); }); }

const server = await import("node:http").then(({ createServer }) =>
  createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "https://iinteligenci.github.io");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }

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

        const accessToken = longLived.access_token || token.access_token;
        const expiresAt = longLived.expires_in ? Date.now() + Number(longLived.expires_in) * 1000 : null;
        metaConnection = { accessToken, expiresAt, connected: true };
        const metaCookie = cookieToken(process.env.META_CLIENT_SECRET, JSON.stringify({ accessToken, expiresAt }));
        res.setHeader("Set-Cookie", "dornelas_meta=" + encodeURIComponent(metaCookie) + "; Path=/; Max-Age=5184000; HttpOnly; Secure; SameSite=None");

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

        res.statusCode = 302;
        res.setHeader("Location", "https://iinteligenci.github.io/Dornelas-IA/?meta=connected");
        res.end();
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
        googleConnection = { accessToken: token?.access_token || null, refreshToken: token?.refresh_token || null, expiresAt: token?.expires_in ? Date.now()+Number(token.expires_in)*1000 : null, connected: Boolean(token?.access_token || token?.refresh_token) };
        if (googleConnection.refreshToken) {
          const googleCookie = cookieToken(process.env.GOOGLE_CLIENT_SECRET, JSON.stringify(googleConnection));
          res.setHeader("Set-Cookie", "dornelas_google=" + encodeURIComponent(googleCookie) + "; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=None");
        }
        res.statusCode = 302;
        res.setHeader("Location", "https://iinteligenci.github.io/Dornelas-IA/?google=connected");
        res.end();
      } catch (error) {
        res.statusCode = 502; res.end(JSON.stringify({ error: "oauth_exchange_failed" }));
      }
      return;
    }

    if (req.method === "GET" && req.url === "/meta/status") {
      if (!metaConnection?.accessToken) {
        const saved = readCookie(req, "dornelas_meta");
        const parsed = saved ? decryptCookie(process.env.META_CLIENT_SECRET, saved) : null;
        if (parsed) {
          try { const data = JSON.parse(parsed); metaConnection = { accessToken: data.accessToken, expiresAt: data.expiresAt || null, connected: true }; } catch {}
        }
      }
      res.end(JSON.stringify({
        connected: Boolean(metaConnection?.accessToken),
        expiresAt: metaConnection?.expiresAt || null
      }));
      return;
    }

    if (req.method === "GET" && req.url === "/google/status") {
      const saved = readCookie(req, "dornelas_google");
      if (saved && !googleConnection) {
        const parsed = decryptCookie(process.env.GOOGLE_CLIENT_SECRET, saved);
        if (parsed) { try { googleConnection = JSON.parse(parsed); } catch {} }
      }
      res.end(JSON.stringify({ connected: Boolean(googleConnection?.refreshToken) }));
      return;
    }

    if (req.method === "GET" && req.url === "/google/data") {
      if (!googleConnection?.accessToken) { res.statusCode=401; res.end(JSON.stringify({error:"google_not_connected"})); return; }
      try {
        const accounts = await googleApiGet({url:"https://mybusinessaccountmanagement.googleapis.com/v1/accounts",accessToken:googleConnection.accessToken});
        const account=(accounts.accounts||[])[0];
        let locations=[];
        if(account?.name){
          const data=await googleApiGet({url:"https://mybusinessbusinessinformation.googleapis.com/v1/"+account.name+"/locations",accessToken:googleConnection.accessToken,params:{readMask:"name,title,storefrontAddress,websiteUri"}});
          locations=data.locations||[];
        }
        res.end(JSON.stringify({account,locations}));
      } catch(error) { res.statusCode=502; res.end(JSON.stringify({error:"google_data_failed",message:error.message})); }
      return;
    }

    if (req.method === "GET" && req.url === "/meta/data") {
      if (!metaConnection?.accessToken) { res.statusCode=401; res.end(JSON.stringify({error:"meta_not_connected"})); return; }
      try {
        const accounts = await metaGraphGet({ path:"/me/accounts", accessToken:metaConnection.accessToken, params:{fields:"id,name,instagram_business_account"} });
        const page=(accounts.data||[]).find(a=>a.instagram_business_account?.id);
        if(!page) throw new Error("Nenhuma conta Instagram profissional vinculada a uma Página foi encontrada.");
        const igId=page.instagram_business_account.id;
        const [profile,media,insights]=await Promise.all([
          metaGraphGet({path:"/"+igId,accessToken:metaConnection.accessToken,params:{fields:"id,username,name,followers_count,media_count,profile_picture_url"}}),
          metaGraphGet({path:"/"+igId+"/media",accessToken:metaConnection.accessToken,params:{fields:"id,caption,like_count,comments_count,timestamp,permalink,media_type,media_url,thumbnail_url",limit:"25"}}),
          metaGraphGet({path:"/"+igId+"/insights",accessToken:metaConnection.accessToken,params:{metric:"accounts_engaged,reach,total_interactions",period:"day"}}).catch(()=>({data:[]}))
        ]);
        res.end(JSON.stringify({page,profile,media:media.data||[],insights:insights.data||[]}));
      } catch(error) { res.statusCode=502; res.end(JSON.stringify({error:"meta_data_failed",message:error.message})); }
      return;
    }

    if (req.method === "POST" && req.url === "/meta/publish") {
      if (!metaConnection?.accessToken) { res.statusCode=401; res.end(JSON.stringify({error:"meta_not_connected"})); return; }
      let body=""; for await (const chunk of req) body+=chunk;
      try {
        const input=JSON.parse(body||"{}");
        if(Number(input.autonomyLevel || 0) < 2) throw new Error("Publicação externa exige autonomia nível 2 ou superior.");
        if(!input.imageUrl || !input.caption) throw new Error("imageUrl e caption são obrigatórios.");
        const accounts=await metaGraphGet({path:"/me/accounts",accessToken:metaConnection.accessToken,params:{fields:"id,name,instagram_business_account"}});
        const page=(accounts.data||[]).find(a=>a.instagram_business_account?.id);
        if(!page) throw new Error("Conta Instagram profissional não encontrada.");
        const igId=page.instagram_business_account.id;
        const creation=await metaGraphPost({path:"/"+igId+"/media",accessToken:metaConnection.accessToken,body:{image_url:input.imageUrl,caption:input.caption}});
        const published=await metaGraphPost({path:"/"+igId+"/media_publish",accessToken:metaConnection.accessToken,body:{creation_id:creation.id}});
        res.end(JSON.stringify({ok:true,creation,published}));
      } catch(error) { res.statusCode=502; res.end(JSON.stringify({error:"meta_publish_failed",message:error.message})); }
      return;
    }

    if (req.method === "POST" && req.url === "/agent/analyze") {
      try {
        const input=JSON.parse(await readBody(req)||"{}");
        const result=await runAI({instructions:SYSTEM_PROMPT,input:JSON.stringify({task:"Analise o aplicativo e o negócio como um todo. Identifique oportunidades de aumento de vendas, gargalos, riscos, dados ausentes e as 3 próximas ações priorizadas.",autonomyLevel:Number(input.autonomyLevel||0),business:"Defumados Dornelas",context:input.context||{}})});
        res.end(JSON.stringify({ok:true,ai:true,model:result.model,analysis:result.text,responseId:result.responseId}));
      } catch(error) { res.statusCode=502; res.end(JSON.stringify({error:"ai_analysis_failed",message:error.message})); }
      return;
    }

    if (req.method === "POST" && req.url === "/agent/campaign") {
      try {
        const input=JSON.parse(await readBody(req)||"{}");
        const product=input.product||"Bacon";
        const result=await runAI({instructions:CAMPAIGN_PROMPT,input:JSON.stringify({business:"Defumados Dornelas",product,autonomyLevel:Number(input.autonomyLevel||0),instagram:input.instagram||null,google:input.google||null,sales:input.sales||null,catalog:input.catalog||null})});
        let campaign;
        try { campaign=JSON.parse(result.text.trim().replaceAll("```json","").replaceAll("```","").trim()); }
        catch { campaign={headline:product+" Dornelas",caption:result.text,cta:"Pedir agora"}; }
        res.end(JSON.stringify({ok:true,ai:true,model:result.model,product,campaign,approvalRequired:true}));
      } catch(error) { res.statusCode=502; res.end(JSON.stringify({error:"ai_campaign_failed",message:error.message})); }
      return;
    }

    if (req.method === "POST" && req.url === "/agent/campaign/approve") {
      try {
        const input=JSON.parse(await readBody(req)||"{}");
        if(!input.approved) throw new Error("A campanha precisa de autorização explícita do usuário.");
        if(Number(input.autonomyLevel||0)<2) throw new Error("Autonomia nível 2 ou superior é necessária.");
        if(!input.imageUrl||!input.caption) throw new Error("A campanha autorizada precisa de imagem pública e legenda.");
        if(!metaConnection?.accessToken) throw new Error("Instagram / Meta não está conectado.");
        const accounts=await metaGraphGet({path:"/me/accounts",accessToken:metaConnection.accessToken,params:{fields:"id,name,instagram_business_account"}});
        const page=(accounts.data||[]).find(a=>a.instagram_business_account?.id);
        if(!page) throw new Error("Conta Instagram profissional não encontrada.");
        const igId=page.instagram_business_account.id;
        const creation=await metaGraphPost({path:"/"+igId+"/media",accessToken:metaConnection.accessToken,body:{image_url:input.imageUrl,caption:input.caption}});
        const published=await metaGraphPost({path:"/"+igId+"/media_publish",accessToken:metaConnection.accessToken,body:{creation_id:creation.id}});
        res.end(JSON.stringify({ok:true,approved:true,published,creation}));
      } catch(error) { res.statusCode=502; res.end(JSON.stringify({error:"campaign_approval_failed",message:error.message})); }
      return;
    }

    if (req.method === "GET" && req.url === "/meta/overview") {
      if (!metaConnection?.accessToken) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: "meta_not_connected" }));
        return;
      }
      try {
        const accounts = await metaGraphGet({
          path: "/me/accounts",
          accessToken: metaConnection.accessToken,
          params: { fields: "id,name,instagram_business_account" }
        });
        const page = (accounts.data || []).find(a => a.instagram_business_account?.id);
        if (!page) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: "instagram_account_not_found", message: "Nenhuma conta Instagram profissional vinculada a uma Página foi encontrada." }));
          return;
        }
        const igId = page.instagram_business_account.id;
        const [profile, media] = await Promise.all([
          metaGraphGet({ path: "/" + igId, accessToken: metaConnection.accessToken, params: { fields: "id,username,name,followers_count,media_count" } }),
          metaGraphGet({ path: "/" + igId + "/media", accessToken: metaConnection.accessToken, params: { fields: "id,caption,like_count,comments_count,timestamp,permalink,media_type,media_url", limit: "25" } })
        ]);
        res.end(JSON.stringify({ page: { id: page.id, name: page.name }, instagram: profile, media: media.data || [] }));
      } catch (error) {
        res.statusCode = 502;
        res.end(JSON.stringify({ error: "meta_graph_failed", message: error.message }));
      }
      return;
    }

    if (req.method === "GET" && req.url === "/meta/accounts") {
      if (!metaConnection?.accessToken) {
        const saved = readCookie(req, "dornelas_meta");
        const parsed = saved ? decryptCookie(process.env.META_CLIENT_SECRET, saved) : null;
        if (parsed) { try { const data = JSON.parse(parsed); metaConnection = { accessToken: data.accessToken, expiresAt: data.expiresAt || null, connected: true }; } catch {} }
      }
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
      let context = { ...demoContext };
      if (metaConnection?.accessToken) {
        try {
          const accounts = await metaGraphGet({
            path: "/me/accounts",
            accessToken: metaConnection.accessToken,
            params: { fields: "id,name,instagram_business_account" }
          });
          const page = (accounts.data || []).find(a => a.instagram_business_account?.id);
          if (page) {
            const igId = page.instagram_business_account.id;
            const [profile, media] = await Promise.all([
              metaGraphGet({ path: "/" + igId, accessToken: metaConnection.accessToken, params: { fields: "id,username,followers_count,media_count" } }),
              metaGraphGet({ path: "/" + igId + "/media", accessToken: metaConnection.accessToken, params: { fields: "id,caption,like_count,comments_count,timestamp,permalink,media_type", limit: "25" } })
            ]);
            context = { ...context, instagram: { profile, media: media.data || [] } };
          }
        } catch (error) {
          console.error("Meta cycle data failed:", error.message);
        }
      }
      const result = await runSalesCycle(context);
      try {
        const ai=await runAI({instructions:SYSTEM_PROMPT,input:JSON.stringify({task:"Execute a análise operacional deste ciclo. Considere os dados disponíveis, encontre a melhor oportunidade de vendas, explique riscos e indique as 3 próximas ações. Não publique nem altere nada nesta etapa.",business:"Defumados Dornelas",autonomyLevel:context.autonomyLevel,context})});
        result.ai={enabled:true,model:ai.model,analysis:ai.text,responseId:ai.responseId};
      } catch(error) {
        result.ai={enabled:false,error:error.message};
      }
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
