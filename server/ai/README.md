# PRODX AI Provider Boundary

This directory contains the server-side, provider-neutral AI boundary for PRODX.

## OKMD configuration

Set these values in the deployment environment or secret manager:

```text
OKMD_AI_BASE_URL=https://gen.ai.kku.ac.th/okmd/api/v1
OKMD_AI_API_KEY=<secret>
OKMD_AI_DEFAULT_MODEL=gemini-2.5-flash-lite
OKMD_AI_TIMEOUT_MS=30000
```

`OKMD_AI_API_KEY` must never be committed, bundled into the browser, returned by a
frontend endpoint, or written to logs.

## Request flow

```text
PRODX UI
  -> authenticated PRODX backend
  -> AIProvider / OKMDProvider
  -> OKMD /chat/completions
```

The provider adapter deliberately lives outside `src/` so the browser bundle cannot
import it accidentally. The adapter also enforces HTTPS, validates basic request
bounds, applies a request timeout, and avoids copying provider response bodies into
errors.

## Production integration boundary

The current repository is a React/Vite application. Its existing authentication
adapter already points the browser at a separate production authentication backend.
Therefore this change adds the provider adapter and server contract, but does not
expose an unauthenticated `/api/ai` route. The production API route must be attached
to the authenticated backend boundary so organization/user authorization, rate
limits, quota policy, audit logging, and data-redaction rules are enforced before an
AI request leaves PRODX.

## Verification

```bash
npm run lint
npm run server:check
npm run server:test
npm run build
```

Tests use a mocked `fetch` implementation and never require a real API key or call
the provider.
