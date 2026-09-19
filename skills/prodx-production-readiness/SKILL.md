# PRODX Production Readiness Skill

## Purpose

Provide an evidence-first final assessment of PRODX-POS production gates without weakening any gate or converting assumptions into PASS.

## Required status model

Each required control MUST be exactly one of:

- Implemented — implementation exists and required evidence is verified.
- Partial — some behavior exists but the complete gate is not satisfied.
- Missing — required implementation/evidence is absent.
- Unverified — implementation may exist, but required evidence was not verified.

## Required gates

- Authentication & Security
- PostgreSQL / Database integrity
- Sales transaction integrity
- Inventory integrity
- Payments
- Refund / Void
- Shift / Cash
- Offline queue / Sync
- Idempotency
- Audit
- Observability
- Backup / Restore
- Disaster Recovery
- Production Infrastructure
- CI/CD
- Security hardening

## Evidence requirements

For every PASS-level conclusion, record concrete evidence such as:

- source file / implementation path
- executable unit/integration/E2E test
- database migration/constraint
- CI workflow and run/result
- runtime/database integration evidence

A green CI run or AI review alone MUST NOT be treated as Production Ready evidence.

## Audit procedure

1. Inspect the actual target branch state.
2. Compare implementation against specification and gates.
3. Inspect tests and CI/CD.
4. Inspect database/integration evidence.
5. Classify each gate.
6. Record evidence and unresolved gaps.
7. Re-audit after convergence/merge on the actual production branch.
8. Do not declare Production Ready while any critical gate lacks verified evidence.

## Failure handling

- Never hide a failure.
- Never disable or weaken CI/security/database gates to obtain PASS.
- Never modify tests merely to conceal a root cause.
- Fix root cause first.
- Treat missing evidence as Unverified or Missing, not PASS.

## Output contract

Every readiness report MUST include:

- audit timestamp
- target branch/commit
- gate-by-gate status
- concrete evidence
- unresolved blockers
- tests/CI evidence and limitations
- explicit statement that Production Ready is withheld unless all critical gates are verified
