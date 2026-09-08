# Backend AI boundary

This is an application-service boundary, not an HTTP endpoint.

The production authentication backend must validate credentials and tenant/store scope first, then pass a verified principal to `AIBackendBoundary`. The boundary enforces the AI permission before calling AI Core.
