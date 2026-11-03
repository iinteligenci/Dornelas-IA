# Semente — Brain foundation and private test index

This change begins the Dornelas-IA to Semente transition without replacing the legacy product.

## Product premise

Semente is a continuity-first work intelligence system, not a generic chat persona. Its operating method is to understand goals, distinguish facts from assumptions, recover relevant context, plan verifiable work, require authorization for external actions, and learn only from confirmed outcomes.

## What is included

- Typed, bounded memory for explicit facts, preferences, decisions, lessons, projects and events.
- Deterministic lexical retrieval ranked by overlap and importance. This is a transparent baseline, not vector search.
- A planner that turns an objective, context and retrieved memories into a validated plan of up to eight steps.
- A conversation service that recovers relevant memory, uses bounded conversation history, and proposes optional memory candidates without saving them automatically.
- A private test index at `/semente`, with login, conversation, objective planning, memory inspection and explicit memory saving.
- Authenticated APIs under `/semente/api/*` using the existing admin session.
- Unit and API tests for the new behavior and authentication boundary.

## Persistence

The memory service uses the existing JSON store interface (getJson / putJson). Its default path is `generated/semente/memory.json` in the configured private data repository. It does not write to the public application repository or store credentials.

If the private data repository is not configured, the memory panel reports that limitation. Conversation can still be used when an AI provider is configured; memory retrieval is best-effort for chat, while memory writes fail closed.

## Safety boundaries

- Memory is explicit: callers decide what is worth remembering. Chat transcripts are not silently persisted.
- The planner only proposes. Its output is marked `plan_only`.
- Unknown risk is normalized to medium. Medium/high-risk and detected external actions require approval.
- No tool execution, publishing, messaging, OAuth access, purchases or external side effects are added.
- The test index is protected by the existing admin login. Its static HTML may load without a session, but all data APIs require a valid session.
- Existing Dornelas routes, integrations, admin UI and tests are retained.

## Current limits

- Memory retrieval is lexical and deterministic; semantic/vector retrieval is not implemented.
- The conversation model is stateless between requests except for bounded history supplied by the UI and explicit persistent memories.
- There is no autonomous task runner, tool registry, task queue or outcome-learning loop yet.
- The existing AI provider configuration is reused; no new credentials are required by this code.
- No production deploy is performed by this PR.

## Verification

Run from the repository root:

    npm run test:server
    npm run build

GitHub Actions checks are the authoritative CI result for this branch. The test index is available from the server at `/semente` after this branch is deployed to a test environment with the existing admin credentials and AI provider configured.
