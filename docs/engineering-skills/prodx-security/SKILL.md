# prodx-security

## Purpose
Security-by-default engineering for authentication, authorization, tenant isolation, secrets, and privileged operations.

## Rules
- Authentication and authorization are server-enforced.
- Store and organization boundaries are enforced in the database and service layer.
- Privileged actions require explicit permissions.
- Secrets remain server-side and are never included in reviewable diffs.
- Fail closed on missing authentication, authorization, or required security configuration.
- Do not weaken security controls to make CI pass.

## Checklist
- [ ] Authenticated boundary exists.
- [ ] Required permission is enforced server-side.
- [ ] Cross-store access is rejected.
- [ ] Cross-organization access is rejected.
- [ ] Secrets are excluded/redacted from AI review input.
- [ ] Error paths do not leak credentials or sensitive data.
- [ ] Security regression tests exist.

## Evidence requirements
PASS requires security test or CI evidence for security claims. Configuration or code presence alone is not proof of enforcement.

## Failure cases
- Missing authorization check
- Cross-tenant access
- Secret leakage
- Fail-open privileged operation
- Client-only permission enforcement
