import { runSalesCycle } from "./agent/cycle.js";
import { createOAuthState } from "./security/state.js";
import { metaAuthorizeUrl, exchangeMetaCode, exchangeForLongLivedMetaToken, metaGraphGet, metaGraphPost, instagramAuthorizeUrl, exchangeInstagramCode, exchangeForLongLivedInstagramToken, instagramGraphGet, instagramGraphPost } from "./integrations/meta.js";
import { googleAuthorizeUrl, exchangeGoogleCode, googleApiGet } from "./integrations/google.js";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { runAI, generateImage } from "./integrations/ai.js";
import { publishPublicAsset, githubJsonGet, githubJsonPut } from "./integrations/assets.js";
import { SYSTEM_PROMPT, CAMPAIGN_PROMPT, CONTENT_PLAN_PROMPT, RESEARCH_PROMPT, SITE_ANALYSIS_PROMPT, REUSE_PROMPT } from "./agent/ai-prompts.js";

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
let metaConnection = process.env.META_ACCESS_TOKEN ? { accessToken: process.env.META_ACCESS_TOKEN, expiresAt: null, connected: true, authType: process.env.META_AUTH_TYPE || "facebook_login" } : null;
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

function cleanJson(text) {
  const raw=String(text||"").trim().replaceAll("\`\`\`json","").replaceAll("\`\`\`","").trim();
  try { return JSON.parse(raw); } catch { return { raw }; }
}

async function fetchSiteSnapshot() {
  const url=process.env.SITE_URL || "https://iinteligenci.github.io/dorn/";
  const response=await fetch(url,{headers:{"User-Agent":"Dornelas-IA/1.0"}});
  if(!response.ok) throw new Error("Site retornou HTTP "+response.status);
  const html=await response.text();
  const title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").replace(/<[^>]+>/g,"").trim();
  const links=[...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].slice(0,60).map(m=>({href:m[1],text:m[2].replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}));
  const text=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,18000);
  return {url,title,links,text};
}

function schedulerPath(){ return process.env.SCHEDULE_FILE || "generated/ai/schedule.json"; }

function runFfmpeg(args){
  return new Promise((resolve,reject)=>{
    const p=spawn(ffmpegPath,args,{stdio:["ignore","ignore","pipe"]});
    let stderr="";
    p.stderr.on("data",d=>stderr+=d.toString());
    p.on("error",reject);
    p.on("close",code=>code===0?resolve():reject(new Error(stderr.slice(-2000)||"ffmpeg failed")));
  });
}

function metaPersistPath(){ return process.env.META_PERSIST_FILE || "generated/ai/meta-connection.json"; }

async function loadPersistedMetaConnection(){
  if(metaConnection?.accessToken) return true;
  if(!process.env.GITHUB_TOKEN || !process.env.META_CLIENT_SECRET) return false;
  try{
    const saved=await githubJsonGet(metaPersistPath());
    if(!saved.exists) return false;
    const encrypted=saved.content?.encrypted;
    const parsed=encrypted?decryptCookie(process.env.META_CLIENT_SECRET,encrypted):null;
    if(!parsed) return false;
    const data=JSON.parse(parsed);
    if(!data.accessToken) return false;
    metaConnection={accessToken:data.accessToken,expiresAt:data.expiresAt||null,connected:true,authType:data.authType||"facebook_login",instagramUserId:data.instagramUserId||null};
    return true;
  }catch(error){ console.error("Meta persisted connection load failed:",error.message); return false; }
}

async function persistMetaConnection(){
  if(!process.env.GITHUB_TOKEN || !metaConnection?.accessToken) return;
  const encrypted=cookieToken(process.env.META_CLIENT_SECRET,JSON.stringify({accessToken:metaConnection.accessToken,expiresAt:metaConnection.expiresAt||null,authType:metaConnection.authType||"facebook_login",instagramUserId:metaConnection.instagramUserId||null}));
  try{
    const current=await githubJsonGet(metaPersistPath());
    await githubJsonPut(metaPersistPath(),{encrypted,updatedAt:new Date().toISOString()},current.sha);
  }catch(error){ console.error("Meta persisted connection save failed:",error.message); }
}


async function getInstagramTarget(){
  await loadPersistedMetaConnection();
  if(!metaConnection?.accessToken) throw new Error("Instagram / Meta não está conectado.");
  if(metaConnection.authType==="instagram_login") return {authType:"instagram_login",igId:metaConnection.instagramUserId||null,page:null};
  const accounts=await metaGraphGet({path:"/me/accounts",accessToken:metaConnection.accessToken,params:{fields:"id,name,instagram_business_account"}});
  const page=(accounts.data||[]).find(a=>a.instagram_business_account?.id);
  if(!page) throw new Error("Nenhuma conta Instagram profissional vinculada a uma Página foi encontrada. Use o botão Conectar Instagram.");
  return {authType:"facebook_login",igId:page.instagram_business_account.id,page};
}

async function publishInstagramMedia({mediaType,imageUrl,videoUrl,caption}){
  const target=await getInstagramTarget();
  const creation=target.authType==="instagram_login"
    ? await instagramGraphPost({path:"/me/media",accessToken:metaConnection.accessToken,body:mediaType==="REELS"?{media_type:"REELS",video_url:videoUrl,caption}:{image_url:imageUrl,caption}})
    : await metaGraphPost({path:"/"+target.igId+"/media",accessToken:metaConnection.accessToken,body:mediaType==="REELS"?{media_type:"REELS",video_url:videoUrl,caption}:{image_url:imageUrl,caption}});
  const published=target.authType==="instagram_login"
    ? await instagramGraphPost({path:"/me/media_publish",accessToken:metaConnection.accessToken,body:{creation_id:creation.id}})
    : await metaGraphPost({path:"/"+target.igId+"/media_publish",accessToken:metaConnection.accessToken,body:{creation_id:creation.id}});
  return {creation,published,authType:target.authType};
}

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

    if (req.method === "GET" && req.url === "/auth/instagram") {
      const clientId=process.env.INSTAGRAM_CLIENT_ID||process.env.META_CLIENT_ID;
      const redirectUri=process.env.INSTAGRAM_REDIRECT_URI||process.env.META_INSTAGRAM_REDIRECT_URI||"https://dornelas-ia.onrender.com/auth/instagram/callback";
      const clientSecret=process.env.INSTAGRAM_CLIENT_SECRET||process.env.META_CLIENT_SECRET;
      if(!clientId||!clientSecret||!redirectUri){res.statusCode=500;res.end(JSON.stringify({error:"instagram_oauth_not_configured",message:"Configure o Login do Instagram no Meta e defina a URL de callback."}));return;}
      const state=createOAuthState(); oauthStates.add(state);
      res.statusCode=302;
      res.setHeader("Location",instagramAuthorizeUrl({clientId,redirectUri,state}));
      res.end(); return;
    }

    if (req.method === "GET" && req.url === "/auth/google") {
      const state = createOAuthState(); oauthStates.add(state);
      res.statusCode = 302;
      res.setHeader("Location", googleAuthorizeUrl({ clientId: process.env.GOOGLE_CLIENT_ID, redirectUri: process.env.GOOGLE_REDIRECT_URI, state }));
      res.end(); return;
    }

    if (req.method === "GET" && req.url.startsWith("/auth/instagram/callback")) {
      const url=new URL(req.url,"http://localhost"); const state=url.searchParams.get("state"); const code=url.searchParams.get("code");
      if(!state||!oauthStates.has(state)){res.statusCode=400;res.end(JSON.stringify({error:"invalid_oauth_state"}));return;} oauthStates.delete(state);
      if(!code){res.statusCode=400;res.end(JSON.stringify({error:"missing_code"}));return;}
      try{
        const clientId=process.env.INSTAGRAM_CLIENT_ID||process.env.META_CLIENT_ID;
        const clientSecret=process.env.INSTAGRAM_CLIENT_SECRET||process.env.META_CLIENT_SECRET;
        const redirectUri=process.env.INSTAGRAM_REDIRECT_URI||process.env.META_INSTAGRAM_REDIRECT_URI||"https://dornelas-ia.onrender.com/auth/instagram/callback";
        const token=await exchangeInstagramCode({clientId,clientSecret,redirectUri,code});
        const longLived=await exchangeForLongLivedInstagramToken({clientSecret,accessToken:token.access_token});
        const accessToken=longLived.access_token||token.access_token;
        const expiresAt=longLived.expires_in?Date.now()+Number(longLived.expires_in)*1000:null;
        metaConnection={accessToken,expiresAt,connected:true,authType:"instagram_login",instagramUserId:token.user_id||longLived.user_id||null};
        await persistMetaConnection();
        const metaCookie=cookieToken(process.env.META_CLIENT_SECRET||clientSecret,JSON.stringify({accessToken,expiresAt,authType:"instagram_login",instagramUserId:metaConnection.instagramUserId}));
        res.setHeader("Set-Cookie","dornelas_meta="+encodeURIComponent(metaCookie)+"; Path=/; Max-Age=5184000; HttpOnly; Secure; SameSite=None");
        res.statusCode=302; res.setHeader("Location","https://iinteligenci.github.io/Dornelas-IA/?instagram=connected"); res.end();
      }catch(error){res.statusCode=502;res.end(JSON.stringify({error:"instagram_oauth_exchange_failed",message:error.message}));}
      return;
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
        metaConnection = { accessToken, expiresAt, connected: true, authType: "facebook_login" };
        await persistMetaConnection();
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
      await loadPersistedMetaConnection();
      if (!metaConnection?.accessToken) {
        const saved = readCookie(req, "dornelas_meta");
        const parsed = saved ? decryptCookie(process.env.META_CLIENT_SECRET, saved) : null;
        if (parsed) {
          try { const data = JSON.parse(parsed); metaConnection = { accessToken: data.accessToken, expiresAt: data.expiresAt || null, connected: true, authType:data.authType||"facebook_login", instagramUserId:data.instagramUserId||null }; } catch {}
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
      try{
        const target=await getInstagramTarget();
        if(target.authType==="instagram_login"){
          const [profile,media,insights]=await Promise.all([
            instagramGraphGet({path:"/me",accessToken:metaConnection.accessToken,params:{fields:"id,username,name,followers_count,media_count,profile_picture_url"}}),
            instagramGraphGet({path:"/me/media",accessToken:metaConnection.accessToken,params:{fields:"id,caption,like_count,comments_count,timestamp,permalink,media_type,media_url,thumbnail_url",limit:"25"}}),
            instagramGraphGet({path:"/"+target.igId+"/insights",accessToken:metaConnection.accessToken,params:{metric:"accounts_engaged,reach,total_interactions",period:"day"}}).catch(()=>({data:[]}))
          ]);
          res.end(JSON.stringify({authType:target.authType,page:null,profile,media:media.data||[],insights:insights.data||[]}));
        }else{
          const [profile,media,insights]=await Promise.all([
            metaGraphGet({path:"/"+target.igId,accessToken:metaConnection.accessToken,params:{fields:"id,username,name,followers_count,media_count,profile_picture_url"}}),
            metaGraphGet({path:"/"+target.igId+"/media",accessToken:metaConnection.accessToken,params:{fields:"id,caption,like_count,comments_count,timestamp,permalink,media_type,media_url,thumbnail_url",limit:"25"}}),
            metaGraphGet({path:"/"+target.igId+"/insights",accessToken:metaConnection.accessToken,params:{metric:"accounts_engaged,reach,total_interactions",period:"day"}}).catch(()=>({data:[]}))
          ]);
          res.end(JSON.stringify({authType:target.authType,page:target.page,profile,media:media.data||[],insights:insights.data||[]}));
        }
      }catch(error){res.statusCode=502;res.end(JSON.stringify({error:"meta_data_failed",message:error.message}));}
      return;
    }

    if (req.method === "POST" && req.url === "/meta/publish") {
      try{
        const input=JSON.parse(await readBody(req)||"{}");
        if(Number(input.autonomyLevel||0)<2) throw new Error("Publicação externa exige autonomia nível 2 ou superior.");
        if(!input.caption) throw new Error("caption é obrigatório.");
        const mediaType=String(input.mediaType||"IMAGE").toUpperCase();
        if(mediaType==="IMAGE"&&!input.imageUrl) throw new Error("imageUrl é obrigatório para IMAGE.");
        if(mediaType==="REELS"&&!input.videoUrl) throw new Error("videoUrl é obrigatório para REELS.");
        const result=await publishInstagramMedia({mediaType,imageUrl:input.imageUrl,videoUrl:input.videoUrl,caption:input.caption});
        res.end(JSON.stringify({ok:true,...result}));
      }catch(error){res.statusCode=502;res.end(JSON.stringify({error:"meta_publish_failed",message:error.message}));}
      return;
    }

    if (req.method === "POST" && req.url === "/agent/chat") {
      try {
        const input=JSON.parse(await readBody(req)||"{}");
        const message=String(input.message||"").trim();
        if(!message){res.statusCode=400;res.end(JSON.stringify({error:"message_required"}));return;}
        const site=await fetchSiteSnapshot().catch(()=>({url:process.env.SITE_URL||"",title:"Defumados Dornelas",text:"",links:[]}));
        const catalog=input.catalog||null;
        const instructions=`Você é a IA comercial da Defumados Dornelas. Seu objetivo é ajudar a aumentar vendas.
Responda em português do Brasil, de forma prática e pronta para uso.
Quando o usuário pedir conteúdo para Instagram, entregue uma versão pronta para copiar e colar, com:
1) texto da publicação;
2) CTA;
3) hashtags somente se fizerem sentido.
Não invente preços, produtos, promoções, estoque ou fatos. Use o catálogo/site fornecido quando disponível.
Se o pedido for sobre estratégia, dê ações concretas e priorizadas.
Não diga que publicou no Instagram: você está apenas preparando o conteúdo para o usuário copiar e publicar manualmente.`;
        const result=await runAI({instructions,input:JSON.stringify({business:"Defumados Dornelas",message,site:{url:site.url,title:site.title,text:site.text?.slice(0,9000)},catalog,history:Array.isArray(input.history)?input.history.slice(-10):[]})});
        res.end(JSON.stringify({ok:true,ai:true,model:result.model,response:result.text,responseId:result.responseId}));
      } catch(error) { res.statusCode=502; res.end(JSON.stringify({error:"ai_chat_failed",message:error.message})); }
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

    if (req.method === "GET" && req.url === "/site/status") {
      try {
        const site=await fetchSiteSnapshot();
        res.end(JSON.stringify({ok:true,connected:true,url:site.url,title:site.title,links:site.links.length}));
      } catch(error) {
        res.statusCode=502; res.end(JSON.stringify({ok:false,connected:false,error:"site_not_reachable",message:error.message}));
      }
      return;
    }

    if (req.method === "GET" && req.url === "/site/catalog") {
      try {
        const site=await fetchSiteSnapshot();
        const result=await runAI({
          instructions:"Extraia o catálogo comercial real do site fornecido. Retorne SOMENTE JSON válido no formato {products:[{name,price,unit,category,description}]} . Não invente nenhum produto, preço, peso, categoria ou informação. Se um campo não estiver claramente presente, use null.",
          input:JSON.stringify({url:site.url,title:site.title,text:site.text,links:site.links})
        });
        res.end(JSON.stringify({ok:true,site:{url:site.url,title:site.title},catalog:cleanJson(result.text),model:result.model}));
      } catch(error) {
        res.statusCode=502; res.end(JSON.stringify({error:"site_catalog_failed",message:error.message}));
      }
      return;
    }

    if (req.method === "GET" && req.url === "/site/analyze") {
      try {
        const site=await fetchSiteSnapshot();
        const result=await runAI({instructions:SITE_ANALYSIS_PROMPT,input:JSON.stringify(site)});
        res.end(JSON.stringify({ok:true,site,result:cleanJson(result.text),model:result.model}));
      } catch(error) { res.statusCode=502; res.end(JSON.stringify({error:"site_analysis_failed",message:error.message})); }
      return;
    }

    if (req.method === "POST" && req.url === "/agent/research") {
      try {
        const input=JSON.parse(await readBody(req)||"{}");
        const result=await runAI({instructions:RESEARCH_PROMPT,input:JSON.stringify({business:"Defumados Dornelas",focus:input.focus||"conteúdo que gere vendas",catalog:input.catalog||null}),tools:[{type:"web_search"}]});
        res.end(JSON.stringify({ok:true,ai:true,model:result.model,research:cleanJson(result.text),responseId:result.responseId}));
      } catch(error) { res.statusCode=502; res.end(JSON.stringify({error:"research_failed",message:error.message})); }
      return;
    }

    if (req.method === "POST" && req.url === "/agent/content-plan") {
      try {
        const input=JSON.parse(await readBody(req)||"{}");
        const site=await fetchSiteSnapshot();
        const instagram=input.instagram||null;
        const researchResult=await runAI({instructions:RESEARCH_PROMPT,input:JSON.stringify({business:"Defumados Dornelas",focus:"conteúdo de alimentação e defumados que gere vendas",site:site.text.slice(0,7000),instagram}),tools:[{type:"web_search"}]});
        const planResult=await runAI({instructions:CONTENT_PLAN_PROMPT,input:JSON.stringify({business:"Defumados Dornelas",site,instagram,research:cleanJson(researchResult.text),catalog:input.catalog||null,now:new Date().toISOString()})});
        res.end(JSON.stringify({ok:true,model:planResult.model,plan:cleanJson(planResult.text),research:cleanJson(researchResult.text),site}));
      } catch(error) { res.statusCode=502; res.end(JSON.stringify({error:"content_plan_failed",message:error.message})); }
      return;
    }

    if (req.method === "POST" && req.url === "/agent/reuse") {
      try {
        const input=JSON.parse(await readBody(req)||"{}");
        const result=await runAI({instructions:REUSE_PROMPT,input:JSON.stringify({business:"Defumados Dornelas",media:input.media||[]})});
        res.end(JSON.stringify({ok:true,model:result.model,reuse:cleanJson(result.text)}));
      } catch(error) { res.statusCode=502; res.end(JSON.stringify({error:"reuse_failed",message:error.message})); }
      return;
    }

    if (req.method === "POST" && req.url === "/agent/image") {
      try {
        const input=JSON.parse(await readBody(req)||"{}");
        if(!input.prompt) throw new Error("prompt é obrigatório.");
        const result=await generateImage({prompt:"Crie uma peça de conteúdo para a marca Defumados Dornelas. Estética artesanal, apetitosa e profissional. Não invente preços, selos, avaliações ou informações. "+input.prompt});
        const asset=await publishPublicAsset({base64:result.b64,filename:"dornelas-"+Date.now()+".png"});
        res.end(JSON.stringify({ok:true,model:result.model,...asset}));
      } catch(error) { res.statusCode=502; res.end(JSON.stringify({error:"image_generation_failed",message:error.message})); }
      return;
    }

    if (req.method === "POST" && req.url === "/agent/clip") {
      try {
        const input=JSON.parse(await readBody(req)||"{}");
        if(!input.sourceUrl) throw new Error("sourceUrl é obrigatório.");
        const start=Math.max(0,Number(input.startSeconds||0));
        const duration=Math.min(60,Math.max(3,Number(input.durationSeconds||15)));
        const sourcePath="/tmp/dornelas-source-"+Date.now()+".mp4";
        const outputPath="/tmp/dornelas-clip-"+Date.now()+".mp4";
        const source=await fetch(input.sourceUrl);
        if(!source.ok) throw new Error("Não foi possível baixar o vídeo original.");
        await fs.writeFile(sourcePath,Buffer.from(await source.arrayBuffer()));
        await runFfmpeg(["-y","-ss",String(start),"-i",sourcePath,"-t",String(duration),"-vf","scale=1080:-2","-c:v","libx264","-preset","veryfast","-c:a","aac","-movflags","+faststart",outputPath]);
        const base64=(await fs.readFile(outputPath)).toString("base64");
        const asset=await publishPublicAsset({base64,filename:"dornelas-corte-"+Date.now()+".mp4",mimeType:"video/mp4"});
        await fs.rm(sourcePath,{force:true}); await fs.rm(outputPath,{force:true});
        res.end(JSON.stringify({ok:true,...asset,startSeconds:start,durationSeconds:duration}));
      } catch(error) { res.statusCode=502; res.end(JSON.stringify({error:"clip_failed",message:error.message})); }
      return;
    }

    if (req.method === "GET" && req.url === "/agent/schedule") {
      try {
        const saved=await githubJsonGet(schedulerPath());
        res.end(JSON.stringify({ok:true,schedule:saved.exists?saved.content:[]}));
      } catch(error) { res.statusCode=502; res.end(JSON.stringify({error:"schedule_read_failed",message:error.message})); }
      return;
    }

    if (req.method === "POST" && req.url === "/agent/schedule") {
      try {
        const input=JSON.parse(await readBody(req)||"{}");
        if(!input.item?.scheduledFor) throw new Error("scheduledFor é obrigatório.");
        if(!input.item?.caption) throw new Error("caption é obrigatório.");
        if(!input.item?.imageUrl) throw new Error("imageUrl público é obrigatório para agendamento.");
        if(!input.item?.approved) throw new Error("O conteúdo precisa ser confirmado antes do agendamento.");
        const current=await githubJsonGet(schedulerPath());
        const list=Array.isArray(current.content)?current.content:[];
        const item={...input.item,id:input.item.id||crypto.randomUUID(),status:"scheduled",createdAt:new Date().toISOString()};
        if(!item.mediaType) item.mediaType=item.videoUrl?"REELS":"IMAGE";
        list.push(item);
        await githubJsonPut(schedulerPath(),list,current.sha);
        res.end(JSON.stringify({ok:true,item}));
      } catch(error) { res.statusCode=502; res.end(JSON.stringify({error:"schedule_write_failed",message:error.message})); }
      return;
    }

    if (req.method === "POST" && req.url === "/agent/scheduler/run") {
      await loadPersistedMetaConnection();
      if(process.env.SCHEDULER_SECRET&&req.headers["x-scheduler-secret"]!==process.env.SCHEDULER_SECRET){res.statusCode=401;res.end(JSON.stringify({error:"invalid_scheduler_secret"}));return;}
      try{
        const current=await githubJsonGet(schedulerPath()); const list=Array.isArray(current.content)?current.content:[]; const now=Date.now();
        const due=list.filter(x=>x.status==="scheduled"&&Date.parse(x.scheduledFor)<=now); const results=[];
        for(const item of due){
          try{
            if(!metaConnection?.accessToken) throw new Error("Instagram / Meta não conectada.");
            const result=await publishInstagramMedia({mediaType:item.mediaType==="REELS"?"REELS":"IMAGE",imageUrl:item.imageUrl,videoUrl:item.videoUrl,caption:item.caption});
            item.status="published"; item.publishedAt=new Date().toISOString(); item.publishedId=result.published?.id||null;
            results.push({id:item.id,status:"published"});
          }catch(error){item.status="failed";item.error=error.message;results.push({id:item.id,status:"failed",error:error.message});}
        }
        if(due.length) await githubJsonPut(schedulerPath(),list,current.sha);
        res.end(JSON.stringify({ok:true,processed:results}));
      }catch(error){res.statusCode=502;res.end(JSON.stringify({error:"scheduler_run_failed",message:error.message}));}
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
      try{
        const input=JSON.parse(await readBody(req)||"{}");
        if(!input.approved) throw new Error("A campanha precisa de autorização explícita do usuário.");
        if(Number(input.autonomyLevel||0)<2) throw new Error("Autonomia nível 2 ou superior é necessária.");
        if(!input.imageUrl||!input.caption) throw new Error("A campanha autorizada precisa de imagem pública e legenda.");
        const result=await publishInstagramMedia({mediaType:"IMAGE",imageUrl:input.imageUrl,caption:input.caption});
        res.end(JSON.stringify({ok:true,approved:true,...result}));
      }catch(error){res.statusCode=502;res.end(JSON.stringify({error:"campaign_approval_failed",message:error.message}));}
      return;
    }

    if (req.method === "GET" && req.url === "/meta/overview") {
      try{
        const target=await getInstagramTarget();
        const [profile,media]=target.authType==="instagram_login"
          ? await Promise.all([instagramGraphGet({path:"/me",accessToken:metaConnection.accessToken,params:{fields:"id,username,name,followers_count,media_count"}}),instagramGraphGet({path:"/me/media",accessToken:metaConnection.accessToken,params:{fields:"id,caption,like_count,comments_count,timestamp,permalink,media_type,media_url",limit:"25"}})])
          : await Promise.all([metaGraphGet({path:"/"+target.igId,accessToken:metaConnection.accessToken,params:{fields:"id,username,name,followers_count,media_count"}}),metaGraphGet({path:"/"+target.igId+"/media",accessToken:metaConnection.accessToken,params:{fields:"id,caption,like_count,comments_count,timestamp,permalink,media_type,media_url",limit:"25"}})]);
        res.end(JSON.stringify({page:target.page,instagram:profile,media:media.data||[],authType:target.authType}));
      }catch(error){res.statusCode=502;res.end(JSON.stringify({error:"meta_graph_failed",message:error.message}));}
      return;
    }

    if (req.method === "GET" && req.url === "/meta/accounts") {
      try{
        const target=await getInstagramTarget();
        if(target.authType==="instagram_login"){
          const profile=await instagramGraphGet({path:"/me",accessToken:metaConnection.accessToken,params:{fields:"id,username,name"}});
          res.end(JSON.stringify({data:[{id:profile.id,name:profile.name||profile.username,instagram_business_account:{id:profile.id,username:profile.username}}],authType:target.authType}));
        }else{
          const result=await metaGraphGet({path:"/me/accounts",accessToken:metaConnection.accessToken,params:{fields:"id,name,instagram_business_account"}});
          res.end(JSON.stringify(result));
        }
      }catch(error){res.statusCode=502;res.end(JSON.stringify({error:"meta_graph_failed",message:error.message}));}
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      res.end(JSON.stringify({ ok: true, service: "dornelas-ia-agent", aiConfigured:Boolean(process.env.OPENAI_API_KEY), imageConfigured:Boolean(process.env.OPENAI_API_KEY), assetStorageConfigured:Boolean(process.env.GITHUB_TOKEN), schedulerConfigured:Boolean(process.env.GITHUB_TOKEN && process.env.SCHEDULER_SECRET) }));
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
