# PRODX Security Production Skill

## Purpose
Audit authentication, authorization, credential handling, store isolation, secrets, and security defaults for PRODX-POS.

## Mandatory rules
- Credentials and provider API keys stay server-side or in approved secret stores; never commit secrets or persist passwords in browser storage.
- Authentication must have an explicit lifecycle: credential verification, session/token issuance, expiry, refresh/revocation where applicable, and logout/invalidation behavior.
- Authorization is server-enforced for every protected resource and mutation.
- Store/tenant isolation must be enforced from authenticated server context, not client-supplied store identifiers alone.
- Privilege-sensitive operations require explicit authorization and audit evidence.
- Default-deny is preferred for protected routes, roles, and permissions.
- Never use mock/default credentials in production paths.
- Security fixes must not bypass architecture, database, or integration gates.

## Review checklist
- [ ] Passwords are hashed with an approved password-hashing scheme and safe parameters.
- [ ] No password or secret is stored in localStorage/sessionStorage or committed to source.
- [ ] Login responses do not expose secrets or credential material.
- [ ] Session/token expiry and invalidation behavior is explicit.
- [ ] Protected routes reject unauthenticated requests.
- [ ] RBAC/authorization is enforced server-side.
- [ ] Store isolation is derived from authenticated context and tested.
- [ ] Privilege escalation and IDOR-style cross-store access are tested.
- [ ] Secrets are supplied through environment/secret management, not source control.
- [ ] Security-sensitive mutations are audited.
- [ ] CI runs secret scanning and relevant security checks.

## Evidence standard
PASS requires concrete evidence from code and tests, including relevant route/service paths and CI results. Security behavior without executable test evidence is `UNVERIFIED`.

## Failure handling
Fix the root cause. Do not silence security tests, weaken authorization, add client-side-only checks, or substitute mock credentials for production authentication.
