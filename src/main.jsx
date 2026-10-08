import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const initialActions=[
 {time:'09:00',type:'Análise',title:'Analisou o estado comercial',detail:'Bacon e Kit Feijoada definidos como prioridades.',status:'Concluído'},
 {time:'09:12',type:'Oportunidade',title:'Identificou oportunidade de campanha',detail:'Criar campanha orgânica para bacon com foco em pedido no site.',status:'Pronto'},
];

const API="https://dornelas-ia.onrender.com";

function App(){
 const [active,setActive]=useState('Visão geral');
 const [mobileMenu,setMobileMenu]=useState(false);
 const [autonomy,setAutonomy]=useState(2);
 const [running,setRunning]=useState(false);
 const [actions,setActions]=useState(initialActions);
 const [metaConnected,setMetaConnected]=useState(false);
 const [googleConnected,setGoogleConnected]=useState(false);
 const [siteConnected,setSiteConnected]=useState(false);
 const [siteCatalog,setSiteCatalog]=useState(null);
 const [error,setError]=useState('');
 const [metaData,setMetaData]=useState(null);
 const [aiAnalysis,setAiAnalysis]=useState('');
 const [loadingMeta,setLoadingMeta]=useState(false);

 const refreshConnections=async()=>{
   try{
     const [m,g,s]=await Promise.all([
       fetch(API+"/meta/status",{credentials:"include"}).then(r=>r.json()),
       fetch(API+"/google/status",{credentials:"include"}).then(r=>r.json()),
       fetch(API+"/site/status").then(r=>r.json())
     ]);
     setMetaConnected(Boolean(m.connected)); setGoogleConnected(Boolean(g.connected)); setSiteConnected(Boolean(s.connected));
   }catch{setMetaConnected(false);setGoogleConnected(false);}
 };
 useEffect(()=>{refreshConnections();},[]);

 const loadMetaData=async()=>{
   if(!metaConnected) return null;
   setLoadingMeta(true);
   try{
     const r=await fetch(API+"/meta/data",{credentials:"include"});
     const d=await r.json();
     if(!r.ok) throw new Error(d.message||d.error||"Falha ao ler Instagram");
     setMetaData(d);
     return d;
   }catch(e){
     setError(e.message);
     return null;
   }finally{setLoadingMeta(false);}
 };

 useEffect(()=>{if(metaConnected&&!metaData) loadMetaData();},[metaConnected]);

 const run=async()=>{
   setRunning(true); setError('');
   try{
     const r=await fetch(API+"/agent/cycle",{method:"POST",credentials:"include"});
     const d=await r.json();
     if(!r.ok) throw new Error(d.message||d.error||'Falha no ciclo');
     const insight=d.instagram?.bestPost;
     setActions(a=>[{time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),type:'IA',title:'Ciclo comercial executado com dados reais',detail:d.source==="real_meta_data"?(insight?("Analisou "+d.instagram.postsAnalyzed+" publicações e identificou a melhor publicação para orientar a próxima ação."): "Conectou ao Instagram e analisou os dados disponíveis."):"Executou o ciclo em modo de demonstração.",status:'Executado'},...a]);
   }catch(e){
     setError(e.message);
     setActions(a=>[{time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),type:'Erro',title:'Ciclo não executado',detail:e.message,status:'Falhou'},...a]);
   }finally{setRunning(false);}
 };

 return <div className="app">
  <aside className={mobileMenu?"mobile-open":""}>
   <div className="brand"><button className="mobile-close" onClick={()=>setMobileMenu(false)}>×</button><div className="logo">D</div><div><strong>Dornelas IA</strong><small>Agente comercial</small></div></div>
   <nav>{['Visão geral','Estúdio IA','Campanhas','Conteúdo','Integrações','Permissões','Resultados','Auditoria'].map(item=><button key={item} className={active===item?'active':''} onClick={()=>{setActive(item);setMobileMenu(false)}}>{item}</button>)}</nav>
   <div className="sidefoot"><span className="dot"/> Sistema operacional</div>
  </aside>
  <button className="mobile-menu" onClick={()=>setMobileMenu(true)} aria-label="Abrir menu">☰ <span>Menu</span></button>
  {mobileMenu&&<div className="mobile-backdrop" onClick={()=>setMobileMenu(false)}/>} 
  <main>
   {active==='Visão geral'&&<Overview aiAnalysis={aiAnalysis} setAiAnalysis={setAiAnalysis} autonomy={autonomy} setAutonomy={setAutonomy} running={running} run={run} actions={actions} metaConnected={metaConnected} googleConnected={googleConnected} siteConnected={siteConnected} refreshConnections={refreshConnections} error={error} metaData={metaData} loadMetaData={loadMetaData} loadingMeta={loadingMeta}/>}
   {active==='Integrações'&&<Integrations metaConnected={metaConnected} googleConnected={googleConnected} siteConnected={siteConnected} refreshConnections={refreshConnections}/>}
   {active==='Estúdio IA'&&<Studio metaData={metaData} setMetaData={setMetaData} metaConnected={metaConnected} autonomy={autonomy} setActions={setActions}/>}
   {active==='Campanhas'&&<Campaigns setActions={setActions} autonomy={autonomy} metaData={metaData}/>} 
   {active==='Conteúdo'&&<Content metaConnected={metaConnected} metaData={metaData} setMetaData={setMetaData} setActions={setActions} autonomy={autonomy}/>} 
   {active==='Permissões'&&<Permissions autonomy={autonomy} setAutonomy={setAutonomy}/>} 
   {active==='Resultados'&&<Results metaConnected={metaConnected} metaData={metaData}/>} 
   {active==='Auditoria'&&<Audit actions={actions}/>}
  </main>
 </div>
}

function Overview({aiAnalysis,setAiAnalysis,autonomy,setAutonomy,running,run,actions,metaConnected,googleConnected,siteConnected,refreshConnections,error,metaData,loadMetaData,loadingMeta}){
 const analyze=async()=>{
   try{
     setAiAnalysis("Analisando dados reais…");
     const liveData=metaData||await loadMetaData();
     const r=await fetch(API+"/agent/analyze",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({autonomyLevel:autonomy,context:{instagram:liveData||null}})});
     const d=await r.json();
     if(!r.ok) throw Error(d.message||d.error||"Falha na análise");
     setAiAnalysis(d.analysis||"A IA não retornou uma análise.");
     setActions(a=>[{time:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),type:"IA",title:"Análise estratégica executada",detail:"GPT-6 Luna analisou o estado comercial.",status:"Concluído"},...a]);
   }catch(e){setAiAnalysis("Erro: "+e.message);}
 };
 return <><header><div><span className="eyebrow">AUTONOMIA COMERCIAL</span><h1>O objetivo é vender mais.</h1><p>A IA monitora o negócio, encontra oportunidades e executa ações autorizadas.</p></div><button className="primary" onClick={run} disabled={running}>{running?'Executando…':'Executar ciclo agora'}</button><button className="secondary" onClick={analyze} disabled={loadingMeta}>{loadingMeta?"Lendo Instagram…":"Analisar com IA"}</button></header>
 <section className="hero"><div><span className="pill green">● Autonomia nível {autonomy}</span><h2>Agente trabalhando para aumentar as vendas</h2><p>O ciclo consulta dados reais das conexões disponíveis.</p></div><div className="autonomy"><label>Nível de autonomia</label><select value={autonomy} onChange={e=>setAutonomy(+e.target.value)}><option value="0">0 — Observar</option><option value="1">1 — Preparar</option><option value="2">2 — Executar ações autorizadas</option><option value="3">3 — Autonomia de vendas</option></select></div></section>
 {error&&<div className="error">⚠ {error}</div>}
 <div className="grid"><Metric title="Vendas hoje" value="R$ 0,00" note="Dados de vendas ainda não conectados"/><Metric title="Pedidos" value="0" note="Integração de pedidos pendente"/><Metric title="Campanhas ativas" value="0" note="Nenhuma publicação automática"/><Metric title="Oportunidades" value="2" note="Detectadas pelo agente"/></div>
 <section className="columns"><ActionCard actions={actions}/><Connections metaConnected={metaConnected} googleConnected={googleConnected} siteConnected={siteConnected} refreshConnections={refreshConnections}/></section>
 {aiAnalysis&&<section className="card ai-analysis"><span className="eyebrow">CÉREBRO OPERACIONAL · GPT-6 LUNA</span><h3>Análise estratégica</h3><pre>{aiAnalysis}</pre></section>}<section className="card objective"><span className="eyebrow">DIRETRIZ PRINCIPAL</span><h3>Aumentar vendas com segurança</h3><div className="rules"><span>✓ Priorizar receita e conversão</span><span>✓ Respeitar estoque e margem</span><span>✓ Não inventar ofertas</span><span>✓ Registrar ações</span></div></section></>
}

function ActionCard({actions}){return <div className="card"><div className="cardhead"><div><span className="eyebrow">CENTRAL DE AÇÕES</span><h3>O que a IA está fazendo</h3></div><span className="live">● LIVE</span></div>{actions.map((a,i)=><div className="action" key={i}><div className="time">{a.time}</div><div className="actionbody"><div className="actiontitle">{a.title}<span>{a.status}</span></div><p>{a.detail}</p></div></div>)}</div>}

function Connections({metaConnected,googleConnected,siteConnected,refreshConnections}){return <div className="card"><div className="cardhead"><div><span className="eyebrow">CONEXÕES</span><h3>Contas e fontes</h3></div><button className="mini" onClick={refreshConnections}>Atualizar</button></div><Connection name="Site Dornelas" status={siteConnected?"Conectado — leitura de catálogo ativa":"Não acessível"} connected={siteConnected}/><Connection name="Instagram / Meta" status={metaConnected?"Conectado":"Login do Instagram necessário"} connected={metaConnected}/><Connection name="Google Business Profile" status={googleConnected?"Conectado":"OAuth necessário"} connected={googleConnected}/><Connection name="Pedidos / vendas" status="Integração ainda não implementada"/><div className="notice">🔒 OAuth, permissões específicas e credenciais fora do código.</div></div>}

function Integrations({metaConnected,googleConnected,siteConnected,refreshConnections}){return <><header><div><span className="eyebrow">INTEGRAÇÕES</span><h1>Conectar e manter conectado.</h1><p>As conexões autorizadas ficam disponíveis ao agente sem armazenar senhas.</p></div><button className="primary" onClick={refreshConnections}>Verificar conexões</button></header><section className="card"><Connection name="Instagram / Meta" status={metaConnected?"Conectado":"OAuth necessário"} connected={metaConnected}/><Connection name="Google Business Profile" status={googleConnected?"Conectado":"OAuth necessário"} connected={googleConnected}/><Connection name="Site Dornelas" status={siteConnected?"Conectado — leitura de catálogo ativa":"Não acessível"} connected={siteConnected}/><Connection name="Pedidos / vendas" status="Ainda não implementado"/></section><div className="notice">Meta já está conectada. A persistência usa cookie HttpOnly seguro; a conexão depende da validade do token autorizado.</div></>}

function Connection({name,status,connected=false}){const isMeta=name.includes("Instagram");const isGoogle=name.includes("Google");const connect=()=>{if(isMeta)window.open(API+"/auth/meta","_blank","noopener,noreferrer");else if(isGoogle)window.location.href=API+"/auth/google";};const active=isMeta||isGoogle;return <div className="connection"><div><b>{name}</b><small>{status}</small></div><button onClick={connect} disabled={!active}>{connected?"Reconectar":(active?"Conectar":"Em breve")}</button></div>}


function Studio({metaData,setMetaData,metaConnected,autonomy,setActions}){
 const [plan,setPlan]=useState(null),[research,setResearch]=useState(null),[site,setSite]=useState(null),[reuse,setReuse]=useState(null),[catalog,setCatalog]=useState(null),[busy,setBusy]=useState(false),[generated,setGenerated]=useState({}),[approved,setApproved]=useState({}),[schedule,setSchedule]=useState({});
 const [chat,setChat]=useState([{role:"assistant",text:"Sou a IA comercial da Dornelas. Me peça uma legenda, roteiro, oferta, anúncio ou ideia de conteúdo. Eu preparo tudo pronto para você copiar e colar no Instagram."}]),[chatInput,setChatInput]=useState(""),[chatBusy,setChatBusy]=useState(false),[copied,setCopied]=useState("");
 const sendChat=async(text=chatInput)=>{const message=String(text||"").trim();if(!message||chatBusy)return;setChatInput("");setChat(c=>[...c,{role:"user",text:message}]);setChatBusy(true);try{const r=await fetch(API+"/agent/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,history:chat.slice(-10),catalog})});const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setChat(c=>[...c,{role:"assistant",text:d.response||"Não consegui gerar a resposta."}]);}catch(e){setChat(c=>[...c,{role:"assistant",text:"Erro: "+e.message}]);}finally{setChatBusy(false)}};
 const copyChat=async(text)=>{try{await navigator.clipboard.writeText(text);setCopied(text);setTimeout(()=>setCopied(""),1500)}catch{alert("Não foi possível copiar automaticamente.")}};
 const loadInstagram=async()=>{if(metaData)return metaData;const r=await fetch(API+"/meta/data",{credentials:"include"});const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setMetaData(d);return d;};
 const build=async()=>{
   setBusy(true);
   try{
     const ig=await loadInstagram().catch(()=>null);
     const r=await fetch(API+"/agent/content-plan",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({instagram:ig})});
     const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setPlan(Array.isArray(d.plan)?d.plan:(d.plan?.items||[]));setResearch(d.research);setSite(d.site);
     setActions(a=>[{time:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),type:"IA",title:"Plano de crescimento criado",detail:"A IA analisou site, Instagram e pesquisa atual.",status:"Pronto"},...a]);
   }catch(e){alert(e.message)}finally{setBusy(false)}
 };
 const researchNow=async()=>{setBusy(true);try{const r=await fetch(API+"/agent/research",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({focus:"curiosidades e assuntos que possam gerar conteúdo e vendas para Defumados Dornelas"})});const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setResearch(d.research)}catch(e){alert(e.message)}finally{setBusy(false)}};
 const readCatalog=async()=>{setBusy(true);try{const r=await fetch(API+"/site/catalog");const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setCatalog(d.catalog)}catch(e){alert(e.message)}finally{setBusy(false)}};
 const analyzeSite=async()=>{setBusy(true);try{const r=await fetch(API+"/site/analyze");const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setSite(d.result)}catch(e){alert(e.message)}finally{setBusy(false)}};
 const reuseNow=async()=>{setBusy(true);try{const ig=await loadInstagram();const r=await fetch(API+"/agent/reuse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({media:ig.media||[]})});const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setReuse(d.reuse)}catch(e){alert(e.message)}finally{setBusy(false)}};
 const gen=async(item,i)=>{try{
   if(item.assetType==="CUT_EXISTING_VIDEO"&&item.sourceMediaId){
     const media=(metaData?.media||[]).find(m=>m.id===item.sourceMediaId);
     if(!media?.media_url)return alert("A publicação escolhida não possui vídeo disponível para corte.");
     const r=await fetch(API+"/agent/clip",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sourceUrl:media.media_url,startSeconds:0,durationSeconds:15})});
     const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setGenerated(g=>({...g,[i]:{url:d.publicUrl||d.dataUrl,type:"REELS"}}));
   }else{
     const r=await fetch(API+"/agent/image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:item.topic+" | Headline: "+item.headline+" | Formato: "+item.format+" | Conteúdo para Instagram da Defumados Dornelas"})});
     const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setGenerated(g=>({...g,[i]:{url:d.publicUrl||d.dataUrl,type:"IMAGE"}}));
   }
 }catch(e){alert(e.message)}};
 const approve=async(item,i)=>{setApproved(a=>({...a,[i]:!a[i]}));};
 const publish=async(item,i)=>{const asset=generated[i];if(!asset?.url)return alert("Gere o ativo primeiro.");if(!approved[i])return alert("Confirme o conteúdo antes de publicar.");if(autonomy<2)return alert("Defina autonomia 2 ou superior.");const r=await fetch(API+"/meta/publish",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({imageUrl:asset.type==="IMAGE"?asset.url:undefined,videoUrl:asset.type==="REELS"?asset.url:undefined,mediaType:asset.type,caption:item.caption,autonomyLevel:autonomy})});const d=await r.json();if(!r.ok)return alert(d.message||d.error);alert("Publicado no Instagram.");setActions(a=>[{time:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),type:"IA",title:"Conteúdo publicado",detail:item.headline,status:"Executado"},...a]);};
 const schedulePost=async(item,i)=>{const asset=generated[i];if(!asset?.url)return alert("Gere o ativo primeiro.");if(!approved[i])return alert("Confirme o conteúdo antes de agendar.");const scheduledFor=schedule[i];if(!scheduledFor)return alert("Escolha data e hora.");const r=await fetch(API+"/agent/schedule",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({item:{...item,imageUrl:asset.type==="IMAGE"?asset.url:null,videoUrl:asset.type==="REELS"?asset.url:null,mediaType:asset.type,approved:true,scheduledFor:new Date(scheduledFor).toISOString()}})});const d=await r.json();if(!r.ok)throw Error(d.message||d.error);alert("Postagem agendada.");};
 return <><section className="card">
  <span className="eyebrow">CHAT COMERCIAL</span><h3>Crie conteúdo para copiar e colar</h3>
  <p className="muted">Não precisa conectar o Instagram. A IA prepara o conteúdo e você publica manualmente.</p>
  <div style={{display:"grid",gap:"10px",maxHeight:"420px",overflowY:"auto",margin:"16px 0"}}>{chat.map((m,i)=><div key={i} className="action"><div className="actionbody"><div className="actiontitle">{m.role==="user"?"Você":"Dornelas IA"}</div><p style={{whiteSpace:"pre-wrap"}}>{m.text}</p>{m.role==="assistant"&&<button className="secondary" onClick={()=>copyChat(m.text)}>{copied===m.text?"✓ Copiado":"Copiar conteúdo"}</button>}</div></div>)}</div>
  <div className="studio-actions"><input style={{flex:1}} value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendChat()}} placeholder="Ex.: crie uma legenda para vender o bacon neste fim de semana"/><button className="primary" onClick={()=>sendChat()} disabled={chatBusy||!chatInput.trim()}>{chatBusy?"Gerando…":"Enviar"}</button></div>
  <div className="studio-actions"><button className="secondary" onClick={()=>sendChat("Crie uma legenda de venda para o Bacon Dornelas, com CTA para pedir pelo site.")}>Legenda para Bacon</button><button className="secondary" onClick={()=>sendChat("Crie uma publicação de venda para o Kit Feijoada, com CTA forte.")}>Kit Feijoada</button><button className="secondary" onClick={()=>sendChat("Crie um roteiro curto de Reels para vender defumados Dornelas.")}>Roteiro de Reels</button></div>
 </section>return <><header><div><span className="eyebrow">ESTÚDIO IA</span><h1>A IA cria. Você confirma.</h1><p>Ela pesquisa, analisa o site e Instagram, monta táticas, prepara conteúdo e entrega o pacote pronto para aprovação.</p></div><button className="primary" onClick={build} disabled={busy}>{busy?"Trabalhando…":"Criar plano de 7 dias"}</button></header>
 <section className="card form"><div className="rules"><span>Pesquisa atual</span><span>Análise do site</span><span>Instagram real</span><span>Curiosidades</span><span>Reaproveitamento</span><span>Artes IA</span></div><div className="studio-actions"><button className="secondary" onClick={researchNow} disabled={busy}>Pesquisar assuntos</button><button className="secondary" onClick={analyzeSite} disabled={busy}>Analisar site</button><button className="secondary" onClick={readCatalog} disabled={busy}>Ler catálogo do site</button><button className="secondary" onClick={reuseNow} disabled={busy||!metaConnected}>Reaproveitar Instagram</button></div></section>
 {catalog&&<section className="card"><span className="eyebrow">CATÁLOGO CONECTADO</span><h3>Produtos encontrados no site</h3><pre>{JSON.stringify(catalog,null,2)}</pre></section>}
 {site&&<section className="card"><span className="eyebrow">SITE</span><h3>Diagnóstico de conversão</h3><pre>{JSON.stringify(site,null,2)}</pre></section>}
 {research&&<section className="card"><span className="eyebrow">PESQUISA</span><h3>Assuntos e curiosidades</h3><pre>{JSON.stringify(research,null,2)}</pre></section>}
 {reuse&&<section className="card"><span className="eyebrow">REAPROVEITAMENTO</span><h3>Cortes e novas versões</h3><pre>{JSON.stringify(reuse,null,2)}</pre></section>}
 {plan?.map((item,i)=><section className="card" key={i}><span className="eyebrow">{item.format||"CONTEÚDO"} · {item.assetType||"ORIGINAL_IMAGE"}</span><h3>{item.headline||item.topic}</h3><p>{item.caption}</p><p><b>Objetivo:</b> {item.objective} · <b>CTA:</b> {item.cta}</p><p className="muted">{item.reason}</p><div className="studio-actions"><button className={approved[i]?"secondary":"primary"} onClick={()=>approve(item,i)}>{approved[i]?"✓ Conteúdo confirmado":"Confirmar conteúdo"}</button><button className="secondary" onClick={()=>gen(item,i)}>{item.assetType==="CUT_EXISTING_VIDEO"?"Gerar corte":"Gerar arte"}</button>{generated[i]&&<button className="secondary" onClick={()=>publish(item,i)} disabled={!approved[i]||autonomy<2}>Publicar agora</button>}</div>{generated[i]&&<>{generated[i].type==="IMAGE"?<img className="studio-image" src={generated[i].url} alt="Arte gerada pela IA"/>:<video className="studio-image" src={generated[i].url} controls/>}<div className="studio-actions"><input type="datetime-local" value={schedule[i]||""} onChange={e=>setSchedule(s=>({...s,[i]:e.target.value}))}/><button className="secondary" onClick={()=>schedulePost(item,i)} disabled={!approved[i]}>Agendar postagem</button></div></>}</section>)}
 </>;
}

function Campaigns({setActions,autonomy,metaData}){
 const [product,setProduct]=useState("Bacon"),[draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[imageUrl,setImageUrl]=useState(""),[approved,setApproved]=useState(false);
 const generate=async()=>{setBusy(true);setApproved(false);try{const r=await fetch(API+"/agent/campaign",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({product,autonomyLevel:autonomy,instagram:metaData||null})});const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setDraft(d.campaign);setActions(a=>[{time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),title:"Campanha preparada",detail:product+" — rascunho comercial criado pela IA.",status:"Rascunho"},...a]);}catch(e){alert(e.message)}finally{setBusy(false)}};
 return <><header><div><span className="eyebrow">CAMPANHAS</span><h1>Criar campanha comercial.</h1><p>A IA prepara a campanha com objetivo de venda.</p></div><button className="primary" onClick={generate} disabled={busy}>{busy?"Gerando…":"Gerar campanha"}</button></header><section className="card form"><label>Produto</label><select value={product} onChange={e=>setProduct(e.target.value)}><option>Bacon</option><option>Kit Feijoada</option></select>{draft&&<div className="draft"><h3>{draft.headline}</h3><p>{draft.caption}</p><b>CTA: {draft.cta}</b><label>URL pública da imagem</label><input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://.../imagem.jpg"/><button className="primary" disabled={autonomy<2} onClick={async()=>{if(!imageUrl)return alert("Informe a imagem da campanha.");const r=await fetch(API+"/agent/campaign/approve",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({approved:true,autonomyLevel,imageUrl,caption:draft.caption})});const d=await r.json();if(!r.ok)return alert(d.message||d.error);setApproved(true);setActions(a=>[{time:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),type:"IA",title:"Campanha autorizada e publicada",detail:"O usuário autorizou e a Meta recebeu a publicação.",status:"Executado"},...a]);}}>{autonomy<2?"Autonomia 2 necessária":"Autorizar e publicar"}</button>{approved&&<span className="pill green">Publicada</span>}</div>}</section></>
}

function Content({metaConnected,metaData,setMetaData,setActions,autonomy}){
 const [loading,setLoading]=useState(false),[caption,setCaption]=useState("Bacon Dornelas: sabor defumado de verdade. Quer pedir? Acesse o catálogo e faça seu pedido."),[imageUrl,setImageUrl]=useState("");
 const load=async()=>{setLoading(true);try{const r=await fetch(API+"/meta/data",{credentials:"include"});const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setMetaData(d);setActions(a=>[{time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),title:"Dados do Instagram atualizados",detail:(d.media||[]).length+" publicações carregadas pela API.",status:"Concluído"},...a]);}catch(e){alert(e.message)}finally{setLoading(false)}};
 const publish=async()=>{if(!imageUrl)return alert("Informe uma URL pública da imagem.");const r=await fetch(API+"/meta/publish",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({imageUrl,caption,autonomyLevel:autonomy})});const d=await r.json();if(!r.ok)return alert(d.message||d.error);setActions(a=>[{time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),title:"Publicação enviada ao Instagram",detail:"A API da Meta aceitou a publicação.",status:"Executado"},...a]);alert("Publicação enviada com sucesso.");load()};
 return <><header><div><span className="eyebrow">CONTEÚDO</span><h1>Conteúdo e desempenho.</h1><p>Consulta dados reais e permite publicação autorizada.</p></div><button className="primary" onClick={load} disabled={!metaConnected||loading}>{loading?"Lendo…":"Ler Instagram"}</button></header>{!metaConnected?<div className="notice">Conecte Instagram / Meta primeiro.</div>:<><div className="grid"><Metric title="Seguidores" value={metaData?.profile?.followers_count??"—"} note="Instagram"/><Metric title="Publicações" value={metaData?.profile?.media_count??"—"} note="Conta conectada"/><Metric title="Alcance" value={insightValue(metaData,"reach")} note="Meta Insights"/><Metric title="Interações" value={insightValue(metaData,"total_interactions")} note="Meta Insights"/></div><section className="card form"><h3>Publicar no Instagram</h3><p className="muted">A publicação usa a API oficial da Meta.</p><label>URL pública da imagem</label><input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://.../imagem.jpg"/><label>Legenda</label><textarea value={caption} onChange={e=>setCaption(e.target.value)} rows="5"/><button className="primary" onClick={publish} disabled={autonomy<2}>{autonomy<2?"Autonomia 2 necessária":"Publicar autorizado"}</button></section><section className="card"><h3>Últimas publicações</h3>{(metaData?.media||[]).slice(0,8).map(m=><div className="action" key={m.id}><div className="time">{new Date(m.timestamp).toLocaleDateString('pt-BR')}</div><div className="actionbody"><div className="actiontitle">{m.like_count||0} curtidas · {m.comments_count||0} comentários</div><p>{m.caption||"Sem legenda"}</p></div></div>)}</section></>}</>
}
function insightValue(data,key){const x=(data?.insights||[]).find(i=>i.name===key);return x?.values?.[0]?.value??"—"}

function Permissions({autonomy,setAutonomy}){return <><header><div><span className="eyebrow">PERMISSÕES</span><h1>Limites do agente.</h1><p>Controle o nível de autonomia antes de permitir ações externas.</p></div></header><section className="card form"><label>Nível de autonomia</label><select value={autonomy} onChange={e=>setAutonomy(+e.target.value)}><option value="0">0 — Observar</option><option value="1">1 — Preparar</option><option value="2">2 — Executar ações autorizadas</option><option value="3">3 — Autonomia de vendas</option></select><div className="rules"><span>✓ Leitura Meta</span><span>✓ Rascunho de campanhas</span><span>✓ Publicação Meta condicionada à permissão</span><span>✕ Descontos automáticos</span><span>✕ Mensagem em massa</span></div></section></>}

function Results({metaConnected,metaData}){return <><header><div><span className="eyebrow">RESULTADOS</span><h1>Resultados reais.</h1><p>Indicadores vindos das integrações conectadas.</p></div></header><div className="grid"><Metric title="Seguidores" value={metaConnected?(metaData?.profile?.followers_count??"—"):"—"} note="Instagram"/><Metric title="Publicações" value={metaData?.media?.length??"—"} note="Analisadas"/><Metric title="Alcance" value={insightValue(metaData,"reach")} note="Meta Insights"/><Metric title="Interações" value={insightValue(metaData,"total_interactions")} note="Meta Insights"/></div></>}

function Panel({title,text}){return <><header><div><span className="eyebrow">MÓDULO</span><h1>{title}</h1><p>{text}</p></div></header><section className="card empty"><h3>{title}</h3><p>{text}</p><span className="statusTag">Funcionalidade em implementação</span></section></>}

function Audit({actions}){return <><header><div><span className="eyebrow">AUDITORIA</span><h1>Registro de ações</h1><p>Histórico das ações executadas pelo agente nesta sessão.</p></div></header><section className="card">{actions.map((a,i)=><div className="action" key={i}><div className="time">{a.time}</div><div className="actionbody"><div className="actiontitle">{a.title}<span>{a.status}</span></div><p>{a.detail}</p></div></div>)}</section></>}

function Metric({title,value,note}){return <div className="metric"><span>{title}</span><strong>{value}</strong><small>{note}</small></div>}

createRoot(document.getElementById('root')).render(<App/>);
