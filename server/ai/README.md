# PRODX AI Provider Boundary

This directory contains the server-side, provider-neutral AI boundary for PRODX.

## OpenRouter configuration

Set these values in the deployment environment or secret manager:

```text
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=<secret>
OPENROUTER_DEFAULT_MODEL=openrouter/free
OPENROUTER_TIMEOUT_MS=30000
```

`OPENROUTER_API_KEY` must never be committed, bundled into the browser, returned by a
frontend endpoint, or written to logs.

## Request flow

```text
PRODX UI
  -> authenticated PRODX backend
  -> AIProvider / OpenRouterProvider
  -> OpenRouter /chat/completions
```

The provider adapter deliberately lives outside `src/` so the browser bundle cannot
import it accidentally. The adapter enforces HTTPS, validates basic request bounds,
applies a request timeout, and avoids copying provider response bodies into errors.

## Production integration boundary

The repository must keep the OpenRouter credential server-side. An authenticated
backend route is required to enforce organization/user authorization, rate limits,
quota policy, audit logging, and data-redaction rules before an AI request leaves
PRODX. The provider adapter alone is not evidence that this production route is wired.

## Verification

```bash
npm run lint
npm run server:check
npm run server:test
npm run build
```

Tests use a mocked `fetch` implementation and never require a real API key or call
the provider.
