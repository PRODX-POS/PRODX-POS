# AI Backend Boundary Contract

- Caller: authenticated production backend only.
- Principal source: verified backend authentication context.
- Required scope: user, organization, and store.
- Required permission: `ai:use`.
- Authorization must complete before AI Core/provider execution.
- Provider credentials remain server-side.
- Browser-supplied principal fields are not trusted as authentication evidence.
- This repository does not expose an unauthenticated AI HTTP route.
