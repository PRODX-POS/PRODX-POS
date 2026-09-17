# PRODX Production Readiness Skill

## Purpose
Act as the final evidence gatekeeper for PRODX-POS. Aggregate architecture, security, database, transaction, inventory, payments, refund/void, shift/cash, offline sync, idempotency, audit, observability, backup/recovery, infrastructure, CI/CD, and hardening evidence.

## Status vocabulary
Use only:
- `IMPLEMENTED` — behavior exists and is verified by appropriate evidence.
- `PARTIAL` — some required behavior exists, but the specification or gate is not fully satisfied.
- `MISSING` — required implementation/evidence does not exist.
- `UNVERIFIED` — implementation may exist, but the required verification evidence is absent or inconclusive.

Do not convert absence of evidence into PASS.

## Gate rules
- Architecture gate must be satisfied before persistence/production implementation is considered complete.
- Database gate must be open with PostgreSQL evidence.
- Critical financial and inventory invariants must be database-enforced where required.
- Authentication and authorization must be server-authoritative and tested.
- Offline sync must execute the complete command lifecycle and be idempotent.
- Audit records must be emitted on required security/financial mutations.
- Observability must provide actionable logs/metrics/tracing for production failures.
- Backup/restore and disaster-recovery claims require execution evidence.
- CI/CD must pass required checks; skipped critical integration tests are not equivalent to PASS.
- A draft PR, local-only test result, or static code inspection does not establish production readiness by itself.

## Evidence record
For each gate record:
- requirement
- implementation path
- test path
- CI workflow/run evidence
- database/infrastructure evidence when applicable
- verification timestamp
- remaining blocker

## Final rule
Never declare `Production Ready` while any critical gate is `PARTIAL`, `MISSING`, or `UNVERIFIED`.

## Failure handling
Report the smallest root-cause blocker and fix it before changing status. Do not lower the gate standard, remove a test, or rewrite evidence to obtain a green status.
