# PRODX Security

## Mission
Keep security default-deny and enforce authentication, authorization, isolation, and safe handling of secrets.

## Rules
- Verify authentication before protected operations and authorization before privileged actions.
- Enforce store/tenant isolation on the server and in data access paths.
- Never trust client-supplied identity, store, role, price, totals, or privilege.
- Use safe password/token/session handling already supported by the stack; never log secrets or credentials.
- Validate untrusted input at boundaries and use parameterized database access.
- Preserve secure headers, TLS assumptions, CSRF protections where applicable, rate limits, and dependency/security gates.
- Do not bypass security checks for tests; use explicit test fixtures or controlled test credentials.

## Gate checklist
- [ ] Authn lifecycle verified.
- [ ] Authz/RBAC verified for privileged actions.
- [ ] Store isolation verified with negative tests.
- [ ] Secrets are not committed or exposed in logs.
- [ ] Injection and unsafe input paths reviewed.
- [ ] Security CI/scanners pass.

## Evidence
PASS only with actual code paths and security/integration/CI evidence. Missing negative tests or unverifiable deployment assumptions are `Unverified`.
