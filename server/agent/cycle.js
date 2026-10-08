import { canExecute, evaluateOpportunity } from "./policy.js";

function analyzeInstagram(instagram) {
  const media = instagram?.media || [];
  if (!media.length) return { hasData: false, recommendations: [] };
  const scored = media.map(m => ({
    ...m,
    engagement: Number(m.like_count || 0) + Number(m.comments_count || 0)
  })).sort((a,b) => b.engagement - a.engagement);
  const best = scored[0];
  const avg = scored.reduce((s,m)=>s+m.engagement,0) / scored.length;
  return {
    hasData: true,
    postsAnalyzed: media.length,
    averageEngagement: Math.round(avg * 100) / 100,
    bestPost: best ? { id: best.id, engagement: best.engagement, caption: best.caption || "", permalink: best.permalink || null } : null,
    recommendations: best ? [
      "Repetir o tema/formato da publicação com maior engajamento.",
      "Criar uma nova oferta com CTA direto para pedido.",
      "Comparar o resultado da nova publicação com a melhor publicação atual."
    ] : []
  };
}

export async function runSalesCycle(context) {
  const startedAt = new Date().toISOString();
  const decisions = [];
  const instagramAnalysis = analyzeInstagram(context.instagram);

  for (const product of context.products ?? []) {
    const opportunity = evaluateOpportunity({
      stock: product.stock,
      margin: product.margin,
      minMargin: product.minMargin
    });

    if (!opportunity.eligible) {
      decisions.push({ type: "skip", product: product.name, reason: opportunity.reason });
      continue;
    }

    const action = {
      type: "campaign_draft",
      product: product.name,
      risk: "low",
      objective: "increase_sales",
      channel: "instagram"
    };

    const policy = canExecute({
      autonomyLevel: context.autonomyLevel,
      permission: context.permissions?.campaignDraft,
      risk: action.risk
    });

    decisions.push({
      ...action,
      status: policy.allowed ? "authorized" : "approval_required",
      reason: policy.reason
    });
  }

  if (instagramAnalysis.hasData) {
    decisions.push({
      type: "instagram_insight",
      status: "analyzed",
      postsAnalyzed: instagramAnalysis.postsAnalyzed,
      averageEngagement: instagramAnalysis.averageEngagement,
      bestPost: instagramAnalysis.bestPost,
      recommendations: instagramAnalysis.recommendations
    });
  } else {
    decisions.push({
      type: "instagram_insight",
      status: "waiting_data",
      reason: "Nenhuma publicação do Instagram foi retornada pela API."
    });
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    objective: "increase_sales",
    source: context.instagram ? "real_meta_data" : "demo_data",
    instagram: instagramAnalysis,
    decisions
  };
}
