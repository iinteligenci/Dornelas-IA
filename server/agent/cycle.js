import { canExecute, evaluateOpportunity } from "./policy.js";

export async function runSalesCycle(context) {
  const startedAt = new Date().toISOString();
  const decisions = [];

  for (const product of context.products ?? []) {
    const opportunity = evaluateOpportunity({
      stock: product.stock,
      margin: product.margin,
      minMargin: product.minMargin
    });

    if (!opportunity.eligible) {
      decisions.push({
        type: "skip",
        product: product.name,
        reason: opportunity.reason
      });
      continue;
    }

    const action = {
      type: "campaign_draft",
      product: product.name,
      risk: "low"
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

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    objective: "increase_sales",
    decisions
  };
}
