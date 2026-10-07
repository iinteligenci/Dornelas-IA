export function canExecute({ autonomyLevel, permission, risk = "low" }) {
  if (!permission?.allowed) return { allowed: false, reason: "Permissão não concedida." };
  if (permission.approvalRequired && autonomyLevel < 3) {
    return { allowed: false, reason: "Ação exige aprovação." };
  }
  if (risk === "high" && autonomyLevel < 3) {
    return { allowed: false, reason: "Ação de alto risco exige aprovação." };
  }
  return { allowed: true, reason: "Ação autorizada pelas políticas atuais." };
}

export function evaluateOpportunity({ stock = 0, margin = 0, minMargin = 0 }) {
  if (stock <= 0) return { eligible: false, reason: "Sem estoque." };
  if (margin < minMargin) return { eligible: false, reason: "Margem abaixo do mínimo." };
  return { eligible: true, reason: "Produto elegível." };
}
