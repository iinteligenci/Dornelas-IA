# Semente — identity, continuity and controlled intelligence

This PR evolves Dornelas-IA toward Semente incrementally. The existing Dornelas product, routes, integrations and tests remain in place.

## Identity

Semente is a general-purpose continuity intelligence, not a work-only assistant or a generic chatbot persona. Its context can include everyday life, relationships, learning, curiosity, creativity, decisions, leisure, projects and work. It must not force every conversation into a productivity task.

The functional self-model is explicit in `server/brain/identity.js`: purpose, domains, principles, operating cycle and limits. This is an architectural identity, not a claim of human-like subjective consciousness, emotions or continuous perception.

## Brain capabilities

- **Explicit memory:** typed facts, preferences, decisions, lessons, projects and events; bounded retention; lexical retrieval; duplicate-content protection; user-controlled deletion.
- **Conversation:** retrieves relevant memories, accepts bounded recent history, returns a natural response, an auditable basis (facts, inferences, hypotheses, unknowns and criteria), and optional memory candidates. No chat transcript is silently persisted.
- **Planning:** creates a bounded plan with observable success criteria, assumptions, risk classification and explicit approval flags. Plans are `plan_only`; no step is executed.
- **Outcome evaluation:** compares objective, expected result, actual result and user-supplied evidence; returns outcome, gaps, confidence, next steps and optional lesson candidates. It never stores lessons automatically.
- **Graceful degradation:** conversation, planning and evaluation can proceed without the optional memory store. The response reports that memory context was unavailable; memory read/write operations themselves fail closed.

## Test interface

- The integrated test index is served by the backend at `/semente`.
- Login uses the existing admin password and signed HttpOnly session cookie.
- The index provides free conversation, planning, outcome evaluation, relevant-memory inspection, verifiable response basis, explicit memory saving and memory deletion.
- All data APIs live under authenticated `/semente/api/*` routes. No public API or client-side secret is introduced.
- `public/semente/index.html` is a GitHub Pages gateway only. Vite copies `public/` into `dist/`, so the page is actually included in the Pages artifact. It checks the backend health endpoint and opens `/semente` on the backend's own origin. It deliberately does not simulate chat or move the admin cookie across domains; same-origin session handling is more reliable and avoids exposing credentials.

## Persistence and provider compatibility

Memory uses the existing JSON store interface and writes to `generated/semente/memory.json` in the configured private data repository. It does not write to the public application repository. The existing `runAI` provider adapter is reused, including current Gemini / compatible-provider configuration. No new credential, OpenAI key, or client-side API key is introduced.

## Safety boundaries

- No legacy component or existing test was removed.
- No conversation is automatically saved.
- Suggested memories and evaluation lessons require explicit human confirmation.
- Planning and evaluation have no external side effects.
- Publishing, messaging, purchases, payments, deletion of external resources and other actions remain unavailable without a separately approved tool and authorization.
- The former `preview/semente/index.html` copy was removed after moving the gateway to `public/semente/index.html`; the old location was outside Vite's build output and would never be published. This is the only removed component, and it was a duplicate introduced for the preview.
- No production deploy was performed.

## Known limitations / next phase

- Retrieval is lexical and transparent, not vector/embedding search.
- The current conversation history is in-memory in the browser tab and is not persisted as a transcript.
- There is no continuous sensor perception, autonomous task queue, tool registry or outcome-learning loop.
- The GitHub Pages gateway at `/Dornelas-IA/semente/` is static. The current Pages workflow publishes only pushes to `main`, so this PR branch is not publicly served; the gateway appears after the PR is merged and the Pages workflow completes. The Node.js backend must be deployed separately and configured with the existing `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, AI provider settings, and private data-store settings if persistent memory is required.
- The Render URL referenced by the gateway (`https://dornelas-ia.onrender.com`) could not be verified from this run. This PR does not deploy or provision services.

## Verification

From the repository root:

    npm run test:server
    npm run build

The PR's GitHub Actions checks are used to confirm these commands on the branch. The integrated index is usable after the branch is deployed to a test backend with admin authentication and an AI provider configured; persistent memory additionally requires the existing private data-store configuration.
