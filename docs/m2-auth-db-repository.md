# M2 Authentication PostgreSQL Repository

## Purpose

Provide the application-facing persistence adapter for the M2 authentication/session service without coupling the auth domain to a PostgreSQL client library.

## Security invariants

- Password hashes are read from `prodx_user_credentials`; plaintext passwords never enter SQL.
- Bearer tokens are represented in persistence only by their SHA-256 `token_hash`.
- User status is authoritative from `prodx_users` when a session is resolved; it is not stored as client-controlled session state.
- Session and device records are scoped by organization through the database foreign keys and the repository queries.
- All values are passed as SQL parameters; SQL text is never constructed from credentials or tokens.

## Current boundary

`SqlExecutor` is intentionally minimal and vendor-independent. The concrete PostgreSQL client is supplied by the application composition root. This keeps the auth service testable and prevents a database SDK from leaking into the authentication policy layer.

## Explicit follow-up

The repository now supports the persistence contract, but production wiring and real PostgreSQL integration tests remain a separate gate. Failed-attempt lockout policy also remains intentionally undefined until its security contract specifies the threshold and duration.
