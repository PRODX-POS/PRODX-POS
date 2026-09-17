# PRODX AI Provider Boundary

This directory contains the server-side, provider-neutral AI boundary for PRODX.

## OpenRouter configuration

Set these values in the deployment environment or secret manager:

```text
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_API_KEY=<secret>
OPENROUTER_DEFAULT_MODEL=openrouter/free
OPENROUTER_TIMEOUT_MS=30000
OPENROUTER_HTTP_REFERER=<optional>
OPENROUTER_APP_TITLE=PRODX-POS
```

`OPENROUTER_API_KEY` must never be committed, bundled into the browser, returned by a
frontend endpoint, or written to logs.

## Request flow

```text
PRODX UI
  -> authenticated PRODX backend
  -> AIGatewayService / AIProvider
  -> OpenRouterProvider
  -> OpenRouter /chat/completions
```

The provider adapter deliberately lives outside `src/` so the browser bundle cannot
import it accidentally. The adapter enforces HTTPS, validates request bounds, applies
a request timeout, rejects streaming through this boundary, and avoids copying
provider response bodies into errors.

## Canonical authorization

The AI boundary requires the canonical PostgreSQL RBAC permission `ai:use`.
Migration `0012_m2_ai_permission` persists that permission in `prodx_permissions`.
Tenant-owned roles may grant it through the existing role-permission and scoped
user-role relationships.

## Production integration boundary

The current repository is a React/Vite application. Its existing authentication
adapter already points the browser at a separate production authentication backend.
Therefore the provider adapter and authenticated server contract must remain behind
that backend boundary. Do not expose the provider directly to the browser.
Organization/user authorization, rate limits, quota policy, audit logging, and
data-redaction rules must be enforced before an AI request leaves PRODX.

The browser service uses `/api/v1/ai/chat` on the configured authenticated backend;
it never accepts or persists an OpenRouter API key.

## Verification

```bash
npm run lint
npm run server:check
npm run server:test
npm run build
```

Tests use a mocked `fetch` implementation and never require a real API key or call
the provider. A real deployment still requires runtime route, secret, connectivity,
and production-environment evidence.
