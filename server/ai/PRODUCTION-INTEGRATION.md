# AI Production Integration Boundary

The production AI path is intentionally layered:

```text
Authenticated backend
  -> AIProductionBoundary
  -> capability allow-list
  -> rate/quota hook
  -> AIBackendBoundary (RBAC + org/store scope)
  -> AICoreService
  -> provider adapter
```

## Controls

- The caller must provide a verified backend principal with organization and store scope.
- `ai:use` remains required by `AIBackendBoundary`.
- Only `assistant`, `explanation`, and `draft` capabilities are allowed.
- Rate limiting/quota enforcement is injected through `AIRateLimiter`; the production backend owns the concrete policy and storage.
- Audit logging is injected through `AIAuditSink`; message content is deliberately excluded from audit events.
- Provider credentials remain server-side and are never part of the browser contract.
- Financial totals, VAT, inventory, payments, refunds, and audit facts remain domain/backend authority.

This repository defines the framework-neutral contract. The concrete authenticated HTTP route belongs to the production backend because this repository's browser application is not the system of record for authentication.
