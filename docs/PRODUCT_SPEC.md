# Dornelas IA — Product Specification

## North Star
**Aumentar as vendas.**

Toda decisão do agente deve ser avaliada pelo impacto esperado em vendas, receita e margem, respeitando estoque, capacidade operacional, regras comerciais e permissões concedidas pelo proprietário.

## Autonomous agent
The agent must be able to:
- inspect authorized data from the Dornelas website, catalog, inventory, prices and orders;
- inspect authorized Instagram/Meta insights and content data;
- manage authorized Google Business Profile presence;
- create campaigns, offers, copy, content plans and calls-to-action;
- execute permitted publishing and profile actions through official APIs/OAuth;
- monitor results and learn from conversion/performance data;
- recommend or execute the next best sales action without requiring a new prompt when autonomous mode is enabled;
- maintain an auditable action log.

## Autonomy levels
### 0 — Observe
Read data and produce recommendations only.

### 1 — Prepare
Create campaigns/content/drafts but require approval before external publication.

### 2 — Execute approved classes
Automatically execute actions explicitly authorized by the owner (for example: publish organic Instagram content, update Google Business Profile posts, refresh campaign copy).

### 3 — Sales autonomy
The agent continuously evaluates performance and executes authorized sales/marketing actions within configured limits. It must not invent prices, discounts, inventory or claims.

## Permissions
Permissions are explicit, revocable and granular by provider/action:
- website read/write;
- Instagram read/publish;
- Google Business Profile read/publish/profile management;
- analytics read;
- customer/order read;
- campaign creation;
- offer/discount creation (disabled by default);
- outbound messaging (disabled by default and subject to provider policy/consent).

Use OAuth and official provider APIs wherever available. Never store raw passwords or ask the agent to bypass platform permissions, CAPTCHAs, rate limits or policies.

## Decision loop
1. Read current business state.
2. Identify sales opportunity.
3. Estimate expected impact and risk.
4. Select the best permitted action.
5. Execute or request approval according to autonomy level.
6. Record action, inputs, result and attribution.
7. Measure conversion/revenue impact.
8. Iterate.

## Business guardrails
- Never sell below configured minimum margin.
- Never advertise unavailable products as available.
- Respect stock and production capacity.
- Respect delivery rules and service area.
- Do not fabricate testimonials, reviews, prices, scarcity or performance claims.
- No mass unsolicited messaging.
- High-impact actions have configurable approval thresholds.

## Initial commercial objective
Start with the Defumados Dornelas operation, prioritizing Bacon and Kit Feijoada, then expand the same architecture to 4K Food Service.

## Architecture principle
The agent is a separate system from the public Dornelas website. The existing website must remain operational and unchanged while this system is developed. Integration occurs through stable APIs/webhooks or other controlled interfaces.
