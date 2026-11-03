# Semente — Brain foundation

This change starts the Dornelas-IA to Semente transition without replacing the existing application.

## What is introduced

- Typed, bounded memory for explicit facts, preferences, decisions, lessons, projects and events.
- Deterministic lexical memory retrieval, ranked by overlap and importance. This is a baseline, not vector search.
- A planner that converts a goal and context into a validated plan of up to eight steps.
- A composition entry point that retrieves relevant project memories before planning.
- Unit tests isolated from external services.

## Persistence

The memory service accepts the existing JSON store interface (getJson / putJson). The intended path is generated/semente/memory.json in the configured private data repository. It does not write to the public application repository or store credentials.

## Safety boundaries

- Memory is explicit: callers decide what is worth remembering. Chat transcripts are not silently persisted.
- The planner only proposes. Its output is marked plan_only.
- Unknown risk is normalized to medium; medium/high-risk steps require approval.
- No tool execution, publishing, messaging, OAuth access, or external side effects are added in this phase.
- Existing Dornelas routes, integrations, admin UI and tests are left untouched.

## Integration contract

A later server integration can compose the brain with the current providers:

    import { createSementeBrain } from "./brain/index.js";
    import { githubJsonGet, githubJsonPut } from "./integrations/data-store.js";
    import { runAI } from "./integrations/ai.js";

    const brain = createSementeBrain({
      store: { getJson: githubJsonGet, putJson: githubJsonPut },
      generate: runAI
    });

Do not expose memory or planning endpoints until they are mounted behind the existing authenticated admin boundary and covered by API tests. Before enabling task execution, add an allowlisted tool registry, durable task state, idempotency, audit logs, explicit approvals and a kill switch.

## Verification

Run npm run test:server and npm run build from the repository root. This connector-based edit does not execute CI locally; GitHub Actions is the source of truth for branch checks.
