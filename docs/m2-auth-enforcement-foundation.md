# M2 Authentication Enforcement Foundation

This document defines the application-security boundary for M2 authentication enforcement.

## Scope

M2 must verify credentials through an explicit service boundary, issue sessions without persisting plaintext bearer tokens, reject disabled devices and expired or revoked sessions, construct an authenticated request context, and delegate authorization to the deterministic policy already established in `server/auth/authorization.ts`.

## Security invariants

- PostgreSQL remains authoritative for user, organization, store, device, and session state.
- Plaintext session tokens must never be persisted.
- Stored session state contains only a token hash.
- Disabled devices cannot authenticate requests.
- Expired or revoked sessions cannot authenticate requests.
- Authenticated context is derived from server-side session state, not caller-supplied organization/store identifiers.
- Authorization remains exact and tenant-scoped; wildcard permissions are not supported.
- No demo unlock credentials or hard-coded production credentials are permitted.

## Deliberate exclusions

M2 does not implement business transactions, inventory, payments, offline sync, hardware integration, refresh-token rotation, or production deployment hardening unless a later approved slice explicitly adds them.

## Delivery gate

Implementation must be introduced from the current `main` HEAD in a focused pull request and must pass the repository's existing typecheck, backend, database, architecture, and security gates. The branch must not weaken or bypass existing checks.
