export function normalizeKnowledge({site,catalog,instagram,google,trends,schedule,audit,config}){
  const now=new Date().toISOString();
  return {
    version:1,updatedAt:now,objective:"increase_sales",business:"Defumados Dornelas",
    sources:{
      site:{available:Boolean(site),url:site?.url||null,title:site?.title||null},
      catalog:{available:Boolean(catalog),products:Array.isArray(catalog?.products)?catalog.products:[]},
      instagram:{available:Boolean(instagram),profile:instagram?.profile||null,media:Array.isArray(instagram?.media)?instagram.media:[],insights:Array.isArray(instagram?.insights)?instagram.insights:[],source:instagram?.source||null},
      googleBusiness:{available:Boolean(google),accounts:google?.account?[google.account]:[],locations:Array.isArray(google?.locations)?google.locations:[]},
      publicTrends:{available:Boolean(trends),items:Array.isArray(trends?.trends)?trends.trends:[],ideas:trends?.ideas||null},
      schedule:{available:Array.isArray(schedule),items:Array.isArray(schedule)?schedule:[]}
    },
    derived:{
      productsCount:Array.isArray(catalog?.products)?catalog.products.length:0,
      instagramPosts:Array.isArray(instagram?.media)?instagram.media.length:0,
      instagramInteractions:Array.isArray(instagram?.media)?instagram.media.reduce((n,p)=>n+(Number(p.like_count)||0)+(Number(p.comments_count)||0),0):0,
      googleLocations:Array.isArray(google?.locations)?google.locations.length:0,
      scheduledItems:Array.isArray(schedule)?schedule.length:0,
      auditOk:Boolean(audit?.ok),config
    }
  };
}
export function knowledgeInstructions(){
 return "Você é o analista de inteligência comercial da Dornelas. Use somente os dados fornecidos. Identifique produtos, sinais de demanda, conteúdo vencedor, presença local, tendências, agenda e lacunas de dados. Não invente preços, estoque, métricas ou fatos. Entregue JSON válido {summary,opportunities:[{priority,action,reason}],risks,missingData,nextChecks}.";
}
