# AI Backend Integration Boundary

The production AI path is intentionally framework-neutral in this repository.

## Required request flow

```text
Authenticated backend
  -> verified user/org/store context
  -> AIBackendBoundary
  -> AI Core
  -> approved AI provider
```

`AIBackendBoundary` rejects requests without verified identity, organization/store scope, or the required `ai:use` permission before invoking AI Core.

A future HTTP adapter must derive the principal from the backend's verified authentication context. Browser-supplied identity, organization, store, or permission fields must never be treated as authentication evidence.

No public unauthenticated `/api/ai` route is introduced here because the production authentication backend is external to this React/Vite repository.
