# M2 Authentication PostgreSQL Integration

## Current step

The application composition boundary now constructs the M2 `SessionIssuer` from the PostgreSQL authentication repository and the existing password verifier. The concrete database client remains outside the authentication policy layer and must provide the parameterized `SqlExecutor` contract.

## Security invariants

- Authentication policy remains server-authoritative for user, organization, store, and device scope.
- Password verification uses the existing scrypt password format.
- Session persistence receives only the SHA-256 token hash; the bearer token is returned only to the caller.
- SQL values remain parameterized.

## Remaining gate

A concrete PostgreSQL client must be supplied by the application entrypoint, followed by real PostgreSQL integration coverage for credential login, disabled user/device, expired/revoked sessions, cross-tenant isolation, token-hash persistence, and session touch.

Failed-attempt lockout behavior remains blocked on the explicit security contract in issue #51; no threshold or duration is invented here.
