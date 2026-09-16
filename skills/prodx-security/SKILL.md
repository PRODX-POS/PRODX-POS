# PRODX Security Engineering Skill

## Purpose

Review authentication, authorization, session security, tenant/store isolation, secrets, and server-side trust boundaries using secure-by-default controls.

## Required rules

- Authentication MUST be enforced at the server boundary for protected operations.
- Authorization MUST be checked server-side for every privileged mutation and resource scope.
- Store/organization isolation MUST be enforced independently of client-supplied identifiers.
- Passwords MUST use an appropriate password hashing scheme; plaintext or reversible password storage is prohibited.
- Session/token lifecycle MUST include secure issuance, expiry/revocation semantics, and transport protections appropriate to the runtime.
- Sensitive credentials MUST NOT be committed to the repository or exposed in logs.
- Client-provided totals, roles, store IDs, permissions, or other security-sensitive claims MUST NOT be trusted without server validation.
- Security failures MUST fail closed and MUST be observable without leaking secrets.

## Evidence checklist

- [ ] Authentication middleware/routes inspected.
- [ ] Authorization/RBAC checks inspected on privileged operations.
- [ ] Cross-store access tests verified.
- [ ] Session/token lifecycle tests verified.
- [ ] Secret handling and logging inspected.
- [ ] Dependency/security CI checks verified.
- [ ] Negative authorization tests exist and execute in CI.

## Failure cases to test

- Unauthenticated access to protected endpoints.
- Authenticated user accessing another store.
- Privilege escalation from cashier to privileged role.
- Forged or expired session/token.
- Client attempts to override server-calculated totals or scope.
- Secrets appearing in logs or repository contents.

## Gate rule

Do not infer security PASS from the presence of authentication code. PASS requires verified enforcement paths and negative-test evidence.
