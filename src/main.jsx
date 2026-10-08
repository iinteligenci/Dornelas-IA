import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import "./styles.css";

const API="https://dornelas-ia.onrender.com";
const REQUEST_TIMEOUT=25000;

async function api(path,{method="GET",body,timeout=REQUEST_TIMEOUT,signal}={}){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const response=await fetch(API+path,{
   method,
   credentials:"include",
   headers:body!==undefined?{"Content-Type":"application/json"}:undefined,
   body:body!==undefined?JSON.stringify(body):undefined,
   signal:signal||controller.signal
  });
  const text=await response.text();
  let data={};
  try{data=text?JSON.parse(text):{}}catch{data={message:text||"Resposta inválida do servidor."}}
  if(!response.ok)throw new Error(data.message||data.error||"Falha na comunicação com o servidor.");
  return data;
 }catch(error){
  if(error?.name==="AbortError")throw new Error("O servidor demorou demais para responder. Tente novamente.");
  throw error;
 }finally{clearTimeout(timer)}
}

function copyText(text){
 if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);
 const area=document.createElement("textarea");
 area.value=text;area.style.position="fixed";area.style.opacity="0";
 document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();
 return Promise.resolve();
}

class ErrorBoundary extends React.Component{
 constructor(props){super(props);this.state={error:null}}
 static getDerivedStateFromError(error){return {error}}
 render(){
  if(this.state.error){
   return <div className="app"><main className="page"><section className="card">
    <span className="eyebrow">DORNELAS IA</span><h1>O sistema encontrou um erro.</h1>
    <p className="muted">A aplicação foi protegida para não ficar em uma tela vazia.</p>
    <pre>{this.state.error?.message||"Erro inesperado"}</pre>
    <button className="primary" onClick={()=>window.location.reload()}>Recarregar</button>
   </section></main></div>
  }
  return this.props.children
 }
}

function App(){
 const [tab,setTabState]=useState(()=>sessionStorage.getItem("dornelas-tab")||"central");
 const [chatPrompt,setChatPrompt]=useState("");
 const [meta,setMeta]=useState(null),[site,setSite]=useState(null),[health,setHealth]=useState(null);
 const [audit,setAudit]=useState(null),[loading,setLoading]=useState(false),[message,setMessage]=useState("");

 const setTab=tabName=>{setTabState(tabName);sessionStorage.setItem("dornelas-tab",tabName);window.scrollTo({top:0,behavior:"smooth"})};
 const openChat=prompt=>{setChatPrompt(prompt||"");setTab("chat")};

 const refresh=async(force=false)=>{
  if(loading&&!force)return;
  setLoading(true);setMessage("");
  const results=await Promise.allSettled([api("/health"),api("/meta/status"),api("/site/status")]);
  const [h,m,s]=results;
  if(h.status==="fulfilled")setHealth(h.value);else setMessage("IA/servidor: "+h.reason.message);
  if(m.status==="fulfilled")setMeta(m.value);else setMessage(prev=>prev?prev+" · Meta: "+m.reason.message:"Meta: "+m.reason.message);
  if(s.status==="fulfilled")setSite(s.value);else setMessage(prev=>prev?prev+" · Site: "+s.reason.message:"Site: "+s.reason.message);
  setLoading(false);
 };
 useEffect(()=>{refresh()},[]);

 const runAudit=async()=>{
  if(loading)return;
  setLoading(true);setMessage("");
  try{setAudit(await api("/agent/self-audit",{method:"POST",body:{}}));}
  catch(e){setMessage(e.message)}
  finally{setLoading(false)}
 };
 const repair=async()=>{
  if(loading)return;
  setLoading(true);setMessage("");
  try{
   const d=await api("/agent/self-fix",{method:"POST",timeout:60000,body:{}});
   setAudit(d.audit);setMessage(d.message||"Correções seguras aplicadas.");
   await refresh(true);
  }catch(e){setMessage("Falha na autocorreção: "+e.message)}
  finally{setLoading(false)}
 };
 const connect=()=>window.open(API+"/auth/meta","_blank","noopener,noreferrer");
 const instagramReady=Boolean(meta?.targetAvailable);

 return <div className="app">
  <header className="topbar">
   <div className="brand"><div className="logo">D</div><div><b>Dornelas IA</b><small>Agente de vendas</small></div></div>
   <div className="top-actions">
    <span className={"status "+(health==null?"warn":health.aiConfigured?"ok":"bad")}>IA {health==null?"…":health.aiConfigured?"OK":"OFF"}</span>
    <span className={"status "+(instagramReady?"ok":"warn")}>Instagram {instagramReady?"pronto":meta?.connected?"Meta conectada":"pendente"}</span>
    <button className="iconbtn" onClick={refresh} disabled={loading} aria-label="Atualizar">{loading?"…":"↻"}</button>
   </div>
  </header>
  <main>
   {tab==="central"&&<Central meta={meta} site={site} health={health} audit={audit} loading={loading} connect={connect} runAudit={runAudit} repair={repair} message={message} openChat={openChat} setTab={setTab}/>}
   {tab==="chat"&&<Chat initialPrompt={chatPrompt}/>}
   {tab==="conteudo"&&<Content setTab={setTab} openChat={openChat}/>}
   {tab==="agenda"&&<Agenda openChat={openChat}/>}
   {tab==="config"&&<Config meta={meta} connect={connect} refresh={refresh}/>}
  </main>
  <nav className="bottom-nav">
   {[["central","⌂","Central"],["chat","✦","IA"],["conteudo","▣","Conteúdo"],["agenda","◷","Agenda"],["config","⚙","Config."]].map(([id,icon,label])=>
    <button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{icon}<span>{label}</span></button>
   )}
  </nav>
 </div>
}

function Central({meta,site,health,audit,loading,connect,runAudit,repair,message,openChat,setTab}){
 const profile=meta?.data?.profile||null;
 const instagramReady=Boolean(meta?.targetAvailable);
 return <div className="page">
  <section className="hero">
   <div><span className="eyebrow">OBJETIVO ÚNICO</span><h1>Vender mais.</h1><p>Eu encontro oportunidades, crio conteúdo, testo ideias, acompanho resultados e preparo a próxima ação.</p></div>
   <div className="hero-actions">
    <button className="primary" onClick={runAudit} disabled={loading}>{loading?"Analisando…":"Auditar e melhorar"}</button>
    <button className="secondary" onClick={()=>openChat("Analise o negócio Dornelas agora e escolha a ação de maior potencial para gerar vendas nos próximos 7 dias.")}>Falar com a IA</button>
   </div>
  </section>
  {message&&<div className="notice">{message}</div>}
  <div className="grid">
   <Metric title="IA" value={health==null?"…":health.aiConfigured?"Pronta":"Erro"} note={health?.aiConfigured?"modelo configurado":"ver configuração do servidor"}/>
   <Metric title="Instagram" value={instagramReady?"Pronto":meta?.connected?"Meta conectada":"Pendente"} note={profile?("@"+(profile.username||"conta")):(meta?.targetError||"dados ainda não lidos")}/>
   <Metric title="Site" value={site?.connected?"Conectado":site==null?"…":"Erro"} note={site?.connected?"catálogo disponível para análise":"não acessível"}/>
   <Metric title="Modo atual" value={instagramReady?"Instagram":"Venda"} note={instagramReady?"dados e publicação autorizados":"IA de vendas funciona sem Instagram"}/>
  </div>
  <section className="card">
   <div className="cardhead"><div><span className="eyebrow">PRÓXIMA MELHOR AÇÃO</span><h2>Decisão guiada por vendas.</h2></div><span className="pill green">foco em vendas</span></div>
   <div className="next-grid">
    <Action title="1 · Ler Instagram" text={instagramReady?"Analisar publicações, engajamento e padrões vencedores.":meta?.connected?(meta?.targetError||"Meta autorizada, mas o Instagram profissional ainda não foi localizado."):"Conectar a Meta para liberar dados oficiais."} button={instagramReady?"Ver conteúdo":"Conectar / corrigir"} onClick={instagramReady?()=>setTab("conteudo"):connect}/>
    <Action title="2 · Encontrar oportunidade" text="Cruzar catálogo, tendências públicas e contexto comercial para escolher o próximo conteúdo." button="Analisar agora" onClick={()=>openChat("Encontre a melhor oportunidade de venda para a Dornelas agora. Considere catálogo, tendências e margem quando disponíveis. Entregue 3 ações em ordem de prioridade.")}/>
    <Action title="3 · Criar conteúdo" text="Transformar a oportunidade em legenda, Reel, Stories e CTA prontos para copiar." button="Criar conteúdo" onClick={()=>openChat("Crie uma campanha completa para vender Bacon Dornelas: 1 legenda, 1 roteiro de Reel, 5 Stories e CTA. Use somente informações reais do catálogo.")}/>
   </div>
  </section>
  <section className="card sales-mode-card">
   <div className="cardhead"><div><span className="eyebrow">MODO VENDA</span><h2>Você não precisa esperar o Instagram.</h2></div><span className="pill green">ativo</span></div>
   <p className="muted">A IA usa o catálogo do site, pesquisa pública e os prints que você enviar. A conexão automática do Instagram é complementar.</p>
   <div className="next-grid">
    <Action title="Pacote de vendas" text="3 posts + 1 Reel + Stories, pensados para gerar pedidos." button="Criar pacote" onClick={()=>openChat("Crie meu pacote comercial agora: 3 posts, 1 Reel e 5 Stories. Priorize produtos com maior potencial de venda e não invente preço, estoque ou promoção.")}/>
    <Action title="Analisar Insights" text="Envie um print e transforme números em decisões práticas." button="Abrir IA" onClick={()=>openChat("Vou enviar um print dos Insights. Analise o que está funcionando, o que está fraco e exatamente o que devo mudar para vender mais.")}/>
   </div>
  </section>
  {audit&&<section className="card">
   <div className="cardhead"><div><span className="eyebrow">AUTOAVALIAÇÃO</span><h2>Diagnóstico do sistema</h2></div><span className={"pill "+(audit.ok?"green":"yellow")}>{audit.ok?"OK":"atenção"}</span></div>
   <pre>{JSON.stringify(audit,null,2)}</pre><button className="primary" onClick={repair} disabled={loading}>Aplicar correções seguras</button>
  </section>}
  <section className="card">
   <div className="cardhead"><div><span className="eyebrow">CONEXÃO INSTAGRAM</span><h2>{instagramReady?"Instagram pronto para a IA.":"Meta e Instagram ainda precisam de validação."}</h2></div></div>
   <p className="muted">{instagramReady?"Agora a IA pode ler dados e preparar/publicar conteúdo conforme as permissões.":meta?.connected?"A Meta está autorizada, mas o alvo profissional ainda não foi localizado. O sistema já tenta Página e ativos do Business Manager usando o mesmo token.":"Conecte pela Meta para liberar os dados oficiais. Nunca coloque sua senha do Instagram aqui."}</p>
   {!instagramReady&&<button className="secondary" onClick={connect}>{meta?.connected?"Reconectar Meta":"Conectar Instagram"}</button>}
  </section>
 </div>
}

function Action({title,text,button,onClick}){return <div className="next-action"><b>{title}</b><p>{text}</p><button className="secondary" onClick={onClick}>{button}</button></div>}
function Metric({title,value,note}){return <div className="metric"><span>{title}</span><strong>{value}</strong><small>{note}</small></div>}

function Chat({initialPrompt}){
 const [messages,setMessages]=useState([{role:"assistant",text:"Sou o cérebro comercial da Dornelas. Posso trabalhar agora com o catálogo do site, tendências públicas e os prints de Insights que você enviar. Minha meta é transformar análise em pedidos."}]);
 const [input,setInput]=useState(initialPrompt||""),[busy,setBusy]=useState(false),[image,setImage]=useState(null),[copiedId,setCopiedId]=useState(null),[error,setError]=useState("");
 useEffect(()=>{if(initialPrompt)setInput(initialPrompt)},[initialPrompt]);

 const send=async(text=input)=>{
  const clean=String(text||"").trim();
  if((!clean&&!image)||busy)return;
  const userText=clean||"Analise este print do Instagram e diga exatamente o que devo fazer para vender mais.";
  const userMessage={role:"user",text:userText,image:image?.preview};
  const history=[...messages,userMessage].slice(-8);
  setMessages(m=>[...m,userMessage]);setInput("");setError("");setBusy(true);
  try{
   const d=await api("/agent/chat",{method:"POST",timeout:60000,body:{message:userText,history,imageDataUrl:image?.dataUrl||null}});
   setMessages(m=>[...m,{role:"assistant",text:d.response||"Sem resposta."}]);
  }catch(e){setError(e.message);setMessages(m=>[...m,{role:"assistant",text:"Não consegui concluir agora. "+e.message}])}
  finally{setBusy(false);setImage(null)}
 };
 const salesKit=()=>send("Crie meu pacote comercial agora: 3 posts, 1 Reel e 5 Stories. Priorize vendas.");
 const file=e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(!f.type.startsWith("image/")){setError("Envie uma imagem.");return}
  if(f.size>6*1024*1024){setError("Print muito grande. Use até 6 MB.");return}
  const reader=new FileReader();
  reader.onload=()=>setImage({preview:reader.result,dataUrl:reader.result});
  reader.onerror=()=>setError("Não consegui ler o arquivo.");
  reader.readAsDataURL(f);
  e.target.value="";
 };
 const copy=async(id,text)=>{
  try{await copyText(text);setCopiedId(id);setTimeout(()=>setCopiedId(null),1200)}catch{setError("Não consegui copiar. Selecione o texto manualmente.")}
 };
 return <div className="page"><section className="card chat-card">
  <div className="cardhead"><div><span className="eyebrow">CÉREBRO COMERCIAL</span><h1>O que vamos vender?</h1></div><span className="pill green">modo venda ativo</span></div>
  {error&&<div className="notice">{error}</div>}
  <div className="chat-list">{messages.map((m,i)=><div className={"bubble "+m.role} key={i}>
   {m.image&&<img src={m.image} alt="print enviado"/>}<b>{m.role==="user"?"Você":"Dornelas IA"}</b><p>{m.text}</p>
   {m.role==="assistant"&&<button className="mini" onClick={()=>copy(i,m.text)}>{copiedId===i?"✓ Copiado":"Copiar"}</button>}
  </div>)}</div>
  {image&&<div className="attachment">Print anexado <button onClick={()=>setImage(null)}>×</button></div>}
  <div className="chat-compose">
   <label className="attach" title="Anexar print">＋<input type="file" accept="image/*" onChange={file}/></label>
   <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),send())} placeholder="Ex.: faça uma campanha para vender bacon esta semana"/>
   <button className="primary" onClick={()=>send()} disabled={busy}>{busy?"Pensando…":"Enviar"}</button>
  </div>
  <div className="quick">
   <button onClick={()=>send("Analise meus últimos resultados e escolha a próxima publicação.")} disabled={busy}>Analisar dados</button>
   <button onClick={()=>send("Crie 3 ideias de conteúdo em alta para vender Bacon Dornelas.")} disabled={busy}>Conteúdo em alta</button>
   <button onClick={()=>send("Monte um Reel com gancho forte para vender Kit Feijoada.")} disabled={busy}>Reel</button>
   <button className="primary" onClick={salesKit} disabled={busy}>Pacote de vendas</button>
  </div>
 </section></div>
}

function Content({setTab,openChat}){
 const [data,setData]=useState(null),[trend,setTrend]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const load=async()=>{
  if(busy)return;setBusy(true);setError("");
  try{setData(await api("/meta/data"))}catch(e){setError(e.message)}finally{setBusy(false)}
 };
 const trends=async()=>{
  if(busy)return;setBusy(true);setError("");
  try{setTrend(await api("/agent/trends"))}catch(e){setError(e.message)}finally{setBusy(false)}
 };
 const posts=data?.media||[];
 const best=[...posts].sort((a,b)=>(Number(b.like_count)||0)+(Number(b.comments_count)||0)*2-((Number(a.like_count)||0)+(Number(a.comments_count)||0)*2)).slice(0,5);
 const trendPrompt=trend?"Transforme estas tendências públicas em conteúdo de venda para a Dornelas. Escolha somente as que fizerem sentido para alimentação/defumados e não invente fatos: "+JSON.stringify(trend).slice(0,5000):"Crie conteúdo comercial com base nas tendências públicas atuais e no catálogo real.";
 return <div className="page">
  <header className="section-head"><div><span className="eyebrow">DADOS E CONTEÚDO</span><h1>O que está funcionando?</h1><p>Leio o que a Meta disponibilizar e transformo em decisão.</p></div><div className="hero-actions"><button className="primary" onClick={load} disabled={busy}>{busy?"Lendo…":"Ler Instagram"}</button><button className="secondary" onClick={trends} disabled={busy}>Buscar tendências</button></div></header>
  {error&&<div className="notice">{error}</div>}
  {!data?<div className="notice">Ainda não carreguei os dados. Se a Meta estiver conectada, toque em “Ler Instagram”.</div>:<>
   <div className="grid"><Metric title="Conta" value={"@"+(data.profile?.username||"—")} note={data.profile?.followers_count!=null?data.profile.followers_count+" seguidores":"seguidores não disponíveis"}/><Metric title="Posts lidos" value={posts.length} note="últimas publicações acessíveis"/><Metric title="Interações" value={posts.reduce((s,p)=>s+(Number(p.like_count)||0)+(Number(p.comments_count)||0),0)} note="curtidas + comentários"/><Metric title="Insights" value={(data.insights||[]).length} note="métricas retornadas pela Meta"/></div>
   <section className="card"><span className="eyebrow">MELHORES SINAIS</span><h2>Posts para estudar</h2>{best.length?best.map(p=><div className="action" key={p.id}><div className="time">{p.timestamp?new Date(p.timestamp).toLocaleDateString("pt-BR"):"—"}</div><div><b>{p.like_count||0} curtidas · {p.comments_count||0} comentários</b><p className="muted">{p.caption||"Sem legenda"}</p></div></div>):<div className="empty">A Meta não retornou publicações acessíveis.</div>}</section>
  </>}
  {trend&&<section className="card"><span className="eyebrow">TENDÊNCIAS PÚBLICAS</span><h2>Assuntos que podem virar conteúdo</h2><pre>{JSON.stringify(trend,null,2)}</pre><button className="primary" onClick={()=>openChat(trendPrompt)}>Levar para a IA e criar conteúdo</button></section>}
 </div>
}

function Agenda({openChat}){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const load=async()=>{
  if(busy)return;setBusy(true);setError("");
  try{const d=await api("/agent/schedule");setData(Array.isArray(d.schedule)?d.schedule:[])}catch(e){setError(e.message)}finally{setBusy(false)}
 };
 useEffect(()=>{load()},[]);
 return <div className="page"><header className="section-head"><div><span className="eyebrow">PUBLICAÇÃO</span><h1>Agenda automática.</h1><p>A IA prepara e o servidor publica itens aprovados no horário.</p></div><div className="hero-actions"><button className="primary" onClick={load} disabled={busy}>{busy?"Atualizando…":"Atualizar"}</button><button className="secondary" onClick={()=>openChat("Crie uma sequência de conteúdo para os próximos 7 dias e sugira horários. Não publique ainda.")}>Planejar semana</button></div></header>
 {error&&<div className="notice">{error}</div>}
 <section className="card">{data===null?<p className="muted">Carregando agenda…</p>:data.length===0?<div className="empty">Nenhuma postagem agendada ainda.<br/><button className="secondary" onClick={()=>openChat("Crie 7 ideias de posts para esta semana e organize por dia.")}>Criar planejamento com IA</button></div>:data.map(x=><div className="action" key={x.id}><div className="time">{x.scheduledFor?new Date(x.scheduledFor).toLocaleString("pt-BR"):"—"}</div><div><b>{x.headline||x.caption?.slice(0,60)||"Postagem"}</b><p className="muted">{x.status||"sem status"}</p></div></div>)}</section>
 </div>
}

function Config({meta,connect,refresh}){
 const ready=Boolean(meta?.targetAvailable);
 const [busy,setBusy]=useState(false),[report,setReport]=useState(null),[error,setError]=useState("");
 const siteImprove=async()=>{
  if(busy)return;setBusy(true);setError("");
  try{const d=await api("/agent/site-improvements",{method:"POST",timeout:120000,body:{}});setReport({type:"site",data:d});}
  catch(e){setError(e.message)}finally{setBusy(false)}
 };
 const collect=async()=>{
  if(busy)return;setBusy(true);setError("");
  try{const d=await api("/agent/knowledge/collect",{method:"POST",timeout:120000,body:{}});setReport({type:"collect",data:d});}
  catch(e){setError(e.message)}finally{setBusy(false)}
 };
 const test=async()=>{
  if(busy)return;setBusy(true);setError("");
  try{const d=await api("/agent/knowledge/test",{method:"POST",timeout:180000,body:{}});setReport({type:"test",data:d});}
  catch(e){setError(e.message)}finally{setBusy(false)}
 };
 return <div className="page"><header className="section-head"><div><span className="eyebrow">CONEXÕES + INTELIGÊNCIA</span><h1>Dados alimentando a IA.</h1><p>As conexões autorizadas são usadas para coletar dados, testar disponibilidade e construir a base de inteligência comercial.</p></div></header>
  <section className="card"><Connection name="Instagram / Meta" connected={ready} onClick={connect}/>
   <div className="notice">{ready?"Instagram profissional encontrado e pronto para a IA.":meta?.connected?("Meta autorizada, mas o alvo do Instagram não foi encontrado. "+(meta.targetError||"O sistema já tentou os caminhos disponíveis.")):"Ainda não há autorização da Meta."}</div>
   {meta?.connected&&!ready&&<ol className="muted"><li>Abra a Página do Facebook que administra a Dornelas.</li><li>Em Configurações → Contas vinculadas, conecte o Instagram profissional.</li><li>Depois toque em “Reconectar” e autorize novamente.</li></ol>}
   <div className="hero-actions"><button className="secondary" onClick={refresh}>Verificar conexões</button><button className="primary" onClick={collect} disabled={busy}>{busy?"Coletando…":"Construir banco da IA"}</button><button className="secondary" onClick={test} disabled={busy}>{busy?"Testando…":"Testar conexões 10×"}</button><button className="secondary" onClick={siteImprove} disabled={busy}>{busy?"Analisando…":"Propor melhorias no site"}</button></div>
   {error&&<div className="notice">{error}</div>}
   {report&&<section className="card"><span className="eyebrow">{report.type==="test"?"TESTE DE CONEXÕES":report.type==="site"?"MELHORIAS DO SITE":"BASE DE CONHECIMENTO"}</span>
   {report.type==="site"&&report.data?.proposal?<div className="site-proposal"><h2>Plano de melhoria orientado a vendas</h2><p>{report.data.proposal.summary}</p><div className="proposal-grid">{(report.data.proposal.quickWins||[]).map((x,i)=><article className="metric" key={i}><b>{x.title}</b><small>{x.priority} · {x.problem}</small><p>{x.change}</p><span>{x.expectedImpact}</span></article>)}</div><h3>Ordem de implementação</h3><ol>{(report.data.proposal.implementationOrder||[]).map((x,i)=><li key={i}>{x}</li>)}</ol><button className="secondary" onClick={()=>copyText(report.data.proposal.implementationPrompt||"")}>Copiar plano para implementação</button></div>:<pre>{JSON.stringify(report.data,null,2)}</pre>}
  </section>}
  </section>
 </div>
}
function Connection({name,connected,onClick}){return <div className="connection"><div><b>{name}</b><small>{connected?"Conectado ao agente":"Ainda não conectado"}</small></div><button onClick={onClick}>{connected?"Reconectar":"Conectar"}</button></div>}

createRoot(document.getElementById("root")).render(<ErrorBoundary><App/></ErrorBoundary>);
