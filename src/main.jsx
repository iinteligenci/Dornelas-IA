import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import "./styles.css";

const API="https://dornelas-ia.onrender.com";

function App(){
 const [tab,setTab]=useState("central");
 const [meta,setMeta]=useState(null);
 const [site,setSite]=useState(null);
 const [health,setHealth]=useState(null);
 const [audit,setAudit]=useState(null);
 const [loading,setLoading]=useState(false);
 const [message,setMessage]=useState("");

 const refresh=async()=>{
   setLoading(true); setMessage("");
   const get=async(path)=>{const r=await fetch(API+path,{credentials:"include"});return r.json()};
   try{const [h,m,s]=await Promise.all([get("/health"),get("/meta/status"),get("/site/status")]);setHealth(h);setMeta(m);setSite(s);}
   catch(e){setMessage("Não consegui atualizar o estado: "+e.message)}
   finally{setLoading(false)}
 };
 useEffect(()=>{refresh()},[]);

 const runAudit=async()=>{
   setLoading(true);setMessage("");
   try{const r=await fetch(API+"/agent/self-audit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setAudit(d)}
   catch(e){setMessage(e.message)}finally{setLoading(false)}
 };
 const repair=async()=>{
   setLoading(true);setMessage("");
   try{const r=await fetch(API+"/agent/self-fix",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setAudit(d.audit);setMessage(d.message||"Correções seguras aplicadas.");refresh()}
   catch(e){setMessage("Falha na autocorreção: "+e.message)}finally{setLoading(false)}
 };

 const connect=()=>window.open(API+"/auth/meta","_blank","noopener,noreferrer");

 return <div className="app">
   <header className="topbar">
     <div className="brand"><div className="logo">D</div><div><b>Dornelas IA</b><small>Agente de vendas</small></div></div>
     <div className="top-actions"><span className={"status "+(health?.aiConfigured?"ok":"bad")}>IA {health?.aiConfigured?"OK":"OFF"}</span><span className={"status "+(meta?.connected?"ok":"warn")}>Instagram {meta?.connected?"conectado":"não conectado"}</span><button className="iconbtn" onClick={refresh}>↻</button></div>
   </header>

   <main>
    {tab==="central"&&<Central meta={meta} site={site} health={health} audit={audit} loading={loading} connect={connect} runAudit={runAudit} repair={repair} message={message} setTab={setTab}/>}
    {tab==="chat"&&<Chat meta={meta}/>}
    {tab==="conteudo"&&<Content meta={meta} setTab={setTab}/>}
    {tab==="agenda"&&<Agenda/>}
    {tab==="config"&&<Config meta={meta} connect={connect} refresh={refresh}/>}
   </main>

   <nav className="bottom-nav">
    <button className={tab==="central"?"active":""} onClick={()=>setTab("central")}>⌂<span>Central</span></button>
    <button className={tab==="chat"?"active":""} onClick={()=>setTab("chat")}>✦<span>IA</span></button>
    <button className={tab==="conteudo"?"active":""} onClick={()=>setTab("conteudo")}>▣<span>Conteúdo</span></button>
    <button className={tab==="agenda"?"active":""} onClick={()=>setTab("agenda")}>◷<span>Agenda</span></button>
    <button className={tab==="config"?"active":""} onClick={()=>setTab("config")}>⚙<span>Config.</span></button>
   </nav>
 </div>
}

function Central({meta,site,health,audit,loading,connect,runAudit,repair,message,setTab}){
 const profile=meta?.data?.profile||null;
 return <div className="page">
  <section className="hero">
   <div><span className="eyebrow">OBJETIVO ÚNICO</span><h1>Vender mais.</h1><p>Eu encontro oportunidades, crio conteúdo, testo ideias, acompanho resultados e preparo a próxima ação.</p></div>
   <div className="hero-actions"><button className="primary" onClick={runAudit} disabled={loading}>{loading?"Analisando…":"Auditar e melhorar"}</button><button className="secondary" onClick={()=>setTab("chat")}>Falar com a IA</button></div>
  </section>
  {message&&<div className="notice">{message}</div>}
  <div className="grid">
   <Metric title="IA" value={health?.aiConfigured?"Pronta":"Erro"} note={health?.aiConfigured?"modelo configurado":"ver configuração do servidor"}/>
   <Metric title="Instagram" value={meta?.connected?"Conectado":"Pendente"} note={profile?("@"+(profile.username||"conta")):"dados ainda não lidos"}/>
   <Metric title="Site" value={site?.connected?"Conectado":"Erro"} note={site?.connected?"catálogo disponível para análise":"não acessível"}/>
   <Metric title="Publicação" value="Automática" note="após autorização e conexão Meta"/>
  </div>
  <section className="card">
   <div className="cardhead"><div><span className="eyebrow">PRÓXIMA MELHOR AÇÃO</span><h2>Deixe a IA decidir o próximo passo.</h2></div><span className="pill green">foco em vendas</span></div>
   <div className="next-grid"><Action title="1 · Ler Instagram" text={meta?.connected?"Analisar publicações, engajamento e padrões vencedores.":"Conectar a conta Meta para liberar dados reais."} button={meta?.connected?"Ver conteúdo":"Conectar"} onClick={meta?.connected?()=>setTab("conteudo"):connect}/>
   <Action title="2 · Encontrar assunto em alta" text="Usar pesquisa pública + dados próprios para escolher temas com potencial comercial." button="Gerar agora" onClick={()=>setTab("chat")}/>
   <Action title="3 · Criar e publicar" text="Gerar legenda/arte/Reels, testar variações e agendar ou publicar quando autorizado." button="Abrir IA" onClick={()=>setTab("chat")}/></div>
  </section>
  {audit&&<section className="card"><div className="cardhead"><div><span className="eyebrow">AUTOAVALIAÇÃO</span><h2>Diagnóstico do sistema</h2></div><span className={"pill "+(audit.ok?"green":"yellow")}>{audit.ok?"OK":"atenção"}</span></div><pre>{JSON.stringify(audit,null,2)}</pre><button className="primary" onClick={repair} disabled={loading}>Aplicar correções seguras</button></section>}
  <section className="card"><div className="cardhead"><div><span className="eyebrow">PRINCÍPIO</span><h2>Autonomia com freio.</h2></div></div><p className="muted">A IA pode analisar, criar e preparar tudo sozinha. Publicações externas só acontecem quando a permissão de autonomia estiver liberada e a integração oficial estiver funcionando.</p></section>
 </div>
}

function Action({title,text,button,onClick}){return <div className="next-action"><b>{title}</b><p>{text}</p><button className="secondary" onClick={onClick}>{button}</button></div>}
function Metric({title,value,note}){return <div className="metric"><span>{title}</span><strong>{value}</strong><small>{note}</small></div>}

function Chat({meta}){
 const [messages,setMessages]=useState([{role:"assistant",text:"Sou o cérebro comercial da Dornelas. Posso analisar seu Instagram, prints de Insights, catálogo e desempenho e transformar isso em conteúdo e ações de venda."}]);
 const [input,setInput]=useState(""); const [busy,setBusy]=useState(false); const [image,setImage]=useState(null); const [copied,setCopied]=useState(false);
 const send=async(text=input)=>{
  if((!text.trim()&&!image)||busy)return;
  const userText=text.trim()||"Analise este print do Instagram e diga exatamente o que devo fazer para vender mais.";
  setMessages(m=>[...m,{role:"user",text:userText,image:image?.preview}]);setInput("");setBusy(true);
  try{
   const r=await fetch(API+"/agent/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:userText,history:messages.slice(-8),imageDataUrl:image?.dataUrl||null})});
   const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setMessages(m=>[...m,{role:"assistant",text:d.response||"Sem resposta."}]);
  }catch(e){setMessages(m=>[...m,{role:"assistant",text:"Erro: "+e.message}])}finally{setBusy(false);setImage(null)}
 };
 const file=async e=>{const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith("image/"))return alert("Envie uma imagem.");if(f.size>6*1024*1024)return alert("Print muito grande. Use até 6 MB.");const reader=new FileReader();reader.onload=()=>setImage({preview:reader.result,dataUrl:reader.result});reader.readAsDataURL(f)};
 const copy=async t=>{await navigator.clipboard.writeText(t);setCopied(true);setTimeout(()=>setCopied(false),1200)};
 return <div className="page"><section className="card chat-card"><div className="cardhead"><div><span className="eyebrow">CÉREBRO COMERCIAL</span><h1>O que vamos postar?</h1></div><span className="pill green">sempre focado em venda</span></div>
  <div className="chat-list">{messages.map((m,i)=><div className={"bubble "+m.role} key={i}>{m.image&&<img src={m.image} alt="print enviado"/>}<b>{m.role==="user"?"Você":"Dornelas IA"}</b><p>{m.text}</p>{m.role==="assistant"&&<button className="mini" onClick={()=>copy(m.text)}>{copied?"✓ Copiado":"Copiar"}</button>}</div>)}</div>
  {image&&<div className="attachment">Print anexado <button onClick={()=>setImage(null)}>×</button></div>}
  <div className="chat-compose"><label className="attach">＋<input type="file" accept="image/*" onChange={file}/></label><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ex.: encontre a melhor ideia para vender bacon esta semana"/><button className="primary" onClick={()=>send()} disabled={busy}>{busy?"Pensando…":"Enviar"}</button></div>
  <div className="quick"><button onClick={()=>send("Analise meus últimos resultados e escolha a próxima publicação.")}>Analisar Instagram</button><button onClick={()=>send("Crie 3 ideias de conteúdo em alta para vender Bacon Dornelas.")}>Conteúdo em alta</button><button onClick={()=>send("Monte um Reel com gancho forte para vender Kit Feijoada.")}>Reel</button></div>
 </section></div>
}

function Content({meta,setTab}){
 const [data,setData]=useState(null);const [trend,setTrend]=useState(null);const [busy,setBusy]=useState(false);
 const load=async()=>{
  setBusy(true);try{const r=await fetch(API+"/meta/data",{credentials:"include"});const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setData(d)}catch(e){alert(e.message)}finally{setBusy(false)}
 };
 const trends=async()=>{setBusy(true);try{const r=await fetch(API+"/agent/trends");const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setTrend(d)}catch(e){alert(e.message)}finally{setBusy(false)}};
 const posts=data?.media||[];
 const best=[...posts].sort((a,b)=>(b.like_count||0)+(b.comments_count||0)*2-((a.like_count||0)+(a.comments_count||0)*2)).slice(0,5);
 return <div className="page"><header className="section-head"><div><span className="eyebrow">DADOS E CONTEÚDO</span><h1>O que está funcionando?</h1><p>Leio o que a Meta disponibilizar e transformo em decisão.</p></div><div className="hero-actions"><button className="primary" onClick={load} disabled={busy}>{busy?"Lendo…":"Ler Instagram"}</button><button className="secondary" onClick={trends} disabled={busy}>Buscar tendências</button></div></header>
 {!data?<div className="notice">Ainda não carreguei os dados. Se a Meta estiver conectada, toque em “Ler Instagram”.</div>:<><div className="grid"><Metric title="Conta" value={"@"+(data.profile?.username||"—")} note={data.profile?.followers_count!=null?data.profile.followers_count+" seguidores":"seguidores não disponíveis"}/><Metric title="Posts lidos" value={posts.length} note="últimas publicações acessíveis"/><Metric title="Interações" value={posts.reduce((s,p)=>s+(p.like_count||0)+(p.comments_count||0),0)} note="curtidas + comentários"/><Metric title="Insights" value={(data.insights||[]).length} note="métricas retornadas pela Meta"/></div><section className="card"><span className="eyebrow">MELHORES SINAIS</span><h2>Posts para estudar</h2>{best.map(p=><div className="action" key={p.id}><div className="time">{new Date(p.timestamp).toLocaleDateString("pt-BR")}</div><div><b>{p.like_count||0} curtidas · {p.comments_count||0} comentários</b><p className="muted">{p.caption||"Sem legenda"}</p></div></div>)}</section></>}
 {trend&&<section className="card"><span className="eyebrow">TENDÊNCIAS PÚBLICAS</span><h2>Assuntos que podem virar conteúdo</h2><pre>{JSON.stringify(trend,null,2)}</pre><button className="primary" onClick={()=>setTab("chat")}>Levar para a IA e criar conteúdo</button></section>}
 </div>
}

function Agenda(){
 const [data,setData]=useState(null);const [busy,setBusy]=useState(false);
 const load=async()=>{setBusy(true);try{const r=await fetch(API+"/agent/schedule");const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setData(d.schedule||[])}catch(e){alert(e.message)}finally{setBusy(false)}};
 useEffect(()=>{load()},[]);
 return <div className="page"><header className="section-head"><div><span className="eyebrow">PUBLICAÇÃO</span><h1>Agenda automática.</h1><p>A IA prepara e o servidor publica os itens aprovados no horário.</p></div><button className="primary" onClick={load} disabled={busy}>Atualizar</button></header><section className="card">{!data?<p className="muted">Carregando…</p>:data.length===0?<div className="empty">Nenhuma postagem agendada ainda.</div>:data.map(x=><div className="action" key={x.id}><div className="time">{new Date(x.scheduledFor).toLocaleString("pt-BR")}</div><div><b>{x.headline||x.caption?.slice(0,60)||"Postagem"}</b><p className="muted">{x.status}</p></div></div>)}</section></div>
}

function Config({meta,connect,refresh}){return <div className="page"><header className="section-head"><div><span className="eyebrow">CONEXÕES</span><h1>Conectar uma vez.</h1><p>Usamos as credenciais que já existem no servidor. Não coloque senhas aqui.</p></div></header><section className="card"><Connection name="Instagram / Meta" connected={meta?.connected} onClick={connect}/><div className="notice">Se a Meta informar que não encontrou Instagram profissional, a conta precisa estar corretamente vinculada à estrutura comercial da Meta. A IA não deve contornar isso com senha ou automação de tela.</div><button className="secondary" onClick={refresh}>Verificar novamente</button></section></div>}
function Connection({name,connected,onClick}){return <div className="connection"><div><b>{name}</b><small>{connected?"Conectado ao agente":"Ainda não conectado"}</small></div><button onClick={onClick}>{connected?"Reconectar":"Conectar"}</button></div>}

createRoot(document.getElementById("root")).render(<App/>);
