# PRODX AI Provider Boundary

This directory contains the server-side, provider-neutral AI boundary for PRODX.

## Provider configuration

Provider credentials belong in the deployment secret manager and must never be committed or bundled into the browser. The current production review lane uses OpenRouter in GitHub Actions; the application AI boundary remains provider-neutral so provider selection is explicit and policy-controlled.

For the CI review lane, configure the GitHub Actions secret `OPENROUTER_API_KEY` and repository variables:

```text
OPENROUTER_AI_REVIEW_MODEL_ID=openrouter/auto-beta
OPENROUTER_AI_REVIEW_FALLBACK_MODELS=<optional comma-separated model IDs>
```

`openrouter/auto-beta` is the current Auto Router target for the review lane. It delegates per-request model selection to OpenRouter while the workflow records the actual served model from response metadata. When deterministic selection is required, configure a fixed model ID. The fallback list is an explicit priority-ordered list used when the primary model fails.

For production code review, the workflow uses `cost_tier=max` when Auto Router is selected so the router is allowed to choose from the highest capability band rather than silently optimizing for the cheapest model. This is a routing policy, not a claim that any one model is universally best.

## Request flow

```text
PRODX UI
  -> authenticated PRODX backend
  -> provider-neutral AI boundary
  -> configured AI provider
```

The provider adapter deliberately lives outside `src/` so the browser bundle cannot import server-side provider credentials accidentally. The boundary enforces authenticated authorization, tenant/store scope, auditability, and request limits before provider execution.

## Production integration boundary

The current repository is a React/Vite application with a separate production authentication backend. AI requests must remain behind the authenticated backend boundary so organization/user authorization, rate limits, quota policy, audit logging, and data-redaction rules are enforced before an AI request leaves PRODX.

## Verification

```bash
npm run lint
npm run server:check
npm run server:test
npm run build
```

Provider tests use mocked implementations and never require a real provider API key.
