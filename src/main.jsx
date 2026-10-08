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
 const [autonomy,setAutonomy]=useState(2);
 const [running,setRunning]=useState(false);
 const [actions,setActions]=useState(initialActions);
 const [metaConnected,setMetaConnected]=useState(false);
 const [googleConnected,setGoogleConnected]=useState(false);
 const [error,setError]=useState('');
 const [metaData,setMetaData]=useState(null);

 const refreshConnections=async()=>{
   try{
     const [m,g]=await Promise.all([
       fetch(API+"/meta/status",{credentials:"include"}).then(r=>r.json()),
       fetch(API+"/google/status",{credentials:"include"}).then(r=>r.json())
     ]);
     setMetaConnected(Boolean(m.connected)); setGoogleConnected(Boolean(g.connected));
   }catch{setMetaConnected(false);setGoogleConnected(false);}
 };
 useEffect(()=>{refreshConnections();},[]);

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
  <aside>
   <div className="brand"><div className="logo">D</div><div><strong>Dornelas IA</strong><small>Agente comercial</small></div></div>
   <nav>{['Visão geral','Campanhas','Conteúdo','Integrações','Permissões','Resultados','Auditoria'].map(item=><button key={item} className={active===item?'active':''} onClick={()=>setActive(item)}>{item}</button>)}</nav>
   <div className="sidefoot"><span className="dot"/> Sistema operacional</div>
  </aside>
  <main>
   {active==='Visão geral'&&<Overview autonomy={autonomy} setAutonomy={setAutonomy} running={running} run={run} actions={actions} metaConnected={metaConnected} googleConnected={googleConnected} refreshConnections={refreshConnections} error={error}/>}
   {active==='Integrações'&&<Integrations metaConnected={metaConnected} googleConnected={googleConnected} refreshConnections={refreshConnections}/>}
   {active==='Campanhas'&&<Campaigns setActions={setActions}/>} 
   {active==='Conteúdo'&&<Content metaConnected={metaConnected} metaData={metaData} setMetaData={setMetaData} setActions={setActions}/>} 
   {active==='Permissões'&&<Permissions autonomy={autonomy} setAutonomy={setAutonomy}/>} 
   {active==='Resultados'&&<Results metaConnected={metaConnected} metaData={metaData}/>} 
   {active==='Auditoria'&&<Audit actions={actions}/>}
  </main>
 </div>
}

function Overview({autonomy,setAutonomy,running,run,actions,metaConnected,googleConnected,refreshConnections,error}){
 return <><header><div><span className="eyebrow">AUTONOMIA COMERCIAL</span><h1>O objetivo é vender mais.</h1><p>A IA monitora o negócio, encontra oportunidades e executa ações autorizadas.</p></div><button className="primary" onClick={run} disabled={running}>{running?'Executando…':'Executar ciclo agora'}</button></header>
 <section className="hero"><div><span className="pill green">● Autonomia nível {autonomy}</span><h2>Agente trabalhando para aumentar as vendas</h2><p>O ciclo consulta dados reais das conexões disponíveis.</p></div><div className="autonomy"><label>Nível de autonomia</label><select value={autonomy} onChange={e=>setAutonomy(+e.target.value)}><option value="0">0 — Observar</option><option value="1">1 — Preparar</option><option value="2">2 — Executar ações autorizadas</option><option value="3">3 — Autonomia de vendas</option></select></div></section>
 {error&&<div className="error">⚠ {error}</div>}
 <div className="grid"><Metric title="Vendas hoje" value="R$ 0,00" note="Dados de vendas ainda não conectados"/><Metric title="Pedidos" value="0" note="Integração de pedidos pendente"/><Metric title="Campanhas ativas" value="0" note="Nenhuma publicação automática"/><Metric title="Oportunidades" value="2" note="Detectadas pelo agente"/></div>
 <section className="columns"><ActionCard actions={actions}/><Connections metaConnected={metaConnected} googleConnected={googleConnected} refreshConnections={refreshConnections}/></section>
 <section className="card objective"><span className="eyebrow">DIRETRIZ PRINCIPAL</span><h3>Aumentar vendas com segurança</h3><div className="rules"><span>✓ Priorizar receita e conversão</span><span>✓ Respeitar estoque e margem</span><span>✓ Não inventar ofertas</span><span>✓ Registrar ações</span></div></section></>
}

function ActionCard({actions}){return <div className="card"><div className="cardhead"><div><span className="eyebrow">CENTRAL DE AÇÕES</span><h3>O que a IA está fazendo</h3></div><span className="live">● LIVE</span></div>{actions.map((a,i)=><div className="action" key={i}><div className="time">{a.time}</div><div className="actionbody"><div className="actiontitle">{a.title}<span>{a.status}</span></div><p>{a.detail}</p></div></div>)}</div>}

function Connections({metaConnected,googleConnected,refreshConnections}){return <div className="card"><div className="cardhead"><div><span className="eyebrow">CONEXÕES</span><h3>Contas e fontes</h3></div><button className="mini" onClick={refreshConnections}>Atualizar</button></div><Connection name="Site Dornelas" status="Integração ainda não implementada"/><Connection name="Instagram / Meta" status={metaConnected?"Conectado":"OAuth necessário"} connected={metaConnected}/><Connection name="Google Business Profile" status={googleConnected?"Conectado":"OAuth necessário"} connected={googleConnected}/><Connection name="Pedidos / vendas" status="Integração ainda não implementada"/><div className="notice">🔒 OAuth, permissões específicas e credenciais fora do código.</div></div>}

function Integrations({metaConnected,googleConnected,refreshConnections}){return <><header><div><span className="eyebrow">INTEGRAÇÕES</span><h1>Conectar e manter conectado.</h1><p>As conexões autorizadas ficam disponíveis ao agente sem armazenar senhas.</p></div><button className="primary" onClick={refreshConnections}>Verificar conexões</button></header><section className="card"><Connection name="Instagram / Meta" status={metaConnected?"Conectado":"OAuth necessário"} connected={metaConnected}/><Connection name="Google Business Profile" status={googleConnected?"Conectado":"OAuth necessário"} connected={googleConnected}/><Connection name="Site Dornelas" status="Ainda não implementado"/><Connection name="Pedidos / vendas" status="Ainda não implementado"/></section><div className="notice">Meta já está conectada. A persistência usa cookie HttpOnly seguro; a conexão depende da validade do token autorizado.</div></>}

function Connection({name,status,connected=false}){const isMeta=name.includes("Instagram");const isGoogle=name.includes("Google");const connect=()=>{if(isMeta)window.location.href=API+"/auth/meta";else if(isGoogle)window.location.href=API+"/auth/google";};const active=isMeta||isGoogle;return <div className="connection"><div><b>{name}</b><small>{status}</small></div><button onClick={connect} disabled={!active}>{connected?"Reconectar":(active?"Conectar":"Em breve")}</button></div>}

function Campaigns({setActions}){
 const [product,setProduct]=useState("Bacon"),[draft,setDraft]=useState(null),[busy,setBusy]=useState(false);
 const generate=async()=>{setBusy(true);try{const r=await fetch(API+"/agent/campaign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({product})});const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setDraft(d.draft);setActions(a=>[{time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),title:"Campanha preparada",detail:product+" — rascunho comercial criado.",status:"Rascunho"},...a]);}catch(e){alert(e.message)}finally{setBusy(false)}};
 return <><header><div><span className="eyebrow">CAMPANHAS</span><h1>Criar campanha comercial.</h1><p>A IA prepara a campanha com objetivo de venda.</p></div><button className="primary" onClick={generate} disabled={busy}>{busy?"Gerando…":"Gerar campanha"}</button></header><section className="card form"><label>Produto</label><select value={product} onChange={e=>setProduct(e.target.value)}><option>Bacon</option><option>Kit Feijoada</option></select>{draft&&<div className="draft"><h3>{draft.headline}</h3><p>{draft.caption}</p><b>CTA: {draft.cta}</b></div>}</section></>
}

function Content({metaConnected,metaData,setMetaData,setActions}){
 const [loading,setLoading]=useState(false),[caption,setCaption]=useState("Bacon Dornelas: sabor defumado de verdade. Quer pedir? Acesse o catálogo e faça seu pedido."),[imageUrl,setImageUrl]=useState("");
 const load=async()=>{setLoading(true);try{const r=await fetch(API+"/meta/data",{credentials:"include"});const d=await r.json();if(!r.ok)throw Error(d.message||d.error);setMetaData(d);setActions(a=>[{time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),title:"Dados do Instagram atualizados",detail:(d.media||[]).length+" publicações carregadas pela API.",status:"Concluído"},...a]);}catch(e){alert(e.message)}finally{setLoading(false)}};
 const publish=async()=>{if(!imageUrl)return alert("Informe uma URL pública da imagem.");const r=await fetch(API+"/meta/publish",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({imageUrl,caption})});const d=await r.json();if(!r.ok)return alert(d.message||d.error);setActions(a=>[{time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),title:"Publicação enviada ao Instagram",detail:"A API da Meta aceitou a publicação.",status:"Executado"},...a]);alert("Publicação enviada com sucesso.");load()};
 return <><header><div><span className="eyebrow">CONTEÚDO</span><h1>Conteúdo e desempenho.</h1><p>Consulta dados reais e permite publicação autorizada.</p></div><button className="primary" onClick={load} disabled={!metaConnected||loading}>{loading?"Lendo…":"Ler Instagram"}</button></header>{!metaConnected?<div className="notice">Conecte Instagram / Meta primeiro.</div>:<><div className="grid"><Metric title="Seguidores" value={metaData?.profile?.followers_count??"—"} note="Instagram"/><Metric title="Publicações" value={metaData?.profile?.media_count??"—"} note="Conta conectada"/><Metric title="Alcance" value={insightValue(metaData,"reach")} note="Meta Insights"/><Metric title="Interações" value={insightValue(metaData,"total_interactions")} note="Meta Insights"/></div><section className="card form"><h3>Publicar no Instagram</h3><p className="muted">A publicação usa a API oficial da Meta.</p><label>URL pública da imagem</label><input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://.../imagem.jpg"/><label>Legenda</label><textarea value={caption} onChange={e=>setCaption(e.target.value)} rows="5"/><button className="primary" onClick={publish}>Publicar autorizado</button></section><section className="card"><h3>Últimas publicações</h3>{(metaData?.media||[]).slice(0,8).map(m=><div className="action" key={m.id}><div className="time">{new Date(m.timestamp).toLocaleDateString('pt-BR')}</div><div className="actionbody"><div className="actiontitle">{m.like_count||0} curtidas · {m.comments_count||0} comentários</div><p>{m.caption||"Sem legenda"}</p></div></div>)}</section></>}</>
}
function insightValue(data,key){const x=(data?.insights||[]).find(i=>i.name===key);return x?.values?.[0]?.value??"—"}

function Permissions({autonomy,setAutonomy}){return <><header><div><span className="eyebrow">PERMISSÕES</span><h1>Limites do agente.</h1><p>Controle o nível de autonomia antes de permitir ações externas.</p></div></header><section className="card form"><label>Nível de autonomia</label><select value={autonomy} onChange={e=>setAutonomy(+e.target.value)}><option value="0">0 — Observar</option><option value="1">1 — Preparar</option><option value="2">2 — Executar ações autorizadas</option><option value="3">3 — Autonomia de vendas</option></select><div className="rules"><span>✓ Leitura Meta</span><span>✓ Rascunho de campanhas</span><span>✓ Publicação Meta condicionada à permissão</span><span>✕ Descontos automáticos</span><span>✕ Mensagem em massa</span></div></section></>}

function Results({metaConnected,metaData}){return <><header><div><span className="eyebrow">RESULTADOS</span><h1>Resultados reais.</h1><p>Indicadores vindos das integrações conectadas.</p></div></header><div className="grid"><Metric title="Seguidores" value={metaConnected?(metaData?.profile?.followers_count??"—"):"—"} note="Instagram"/><Metric title="Publicações" value={metaData?.media?.length??"—"} note="Analisadas"/><Metric title="Alcance" value={insightValue(metaData,"reach")} note="Meta Insights"/><Metric title="Interações" value={insightValue(metaData,"total_interactions")} note="Meta Insights"/></div></>}

function Panel({title,text}){return <><header><div><span className="eyebrow">MÓDULO</span><h1>{title}</h1><p>{text}</p></div></header><section className="card empty"><h3>{title}</h3><p>{text}</p><span className="statusTag">Funcionalidade em implementação</span></section></>}

function Audit({actions}){return <><header><div><span className="eyebrow">AUDITORIA</span><h1>Registro de ações</h1><p>Histórico das ações executadas pelo agente nesta sessão.</p></div></header><section className="card">{actions.map((a,i)=><div className="action" key={i}><div className="time">{a.time}</div><div className="actionbody"><div className="actiontitle">{a.title}<span>{a.status}</span></div><p>{a.detail}</p></div></div>)}</section></>}

function Metric({title,value,note}){return <div className="metric"><span>{title}</span><strong>{value}</strong><small>{note}</small></div>}

createRoot(document.getElementById('root')).render(<App/>);
