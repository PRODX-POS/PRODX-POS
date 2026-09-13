# PRODX Production Readiness

## Mission
Provide an evidence-based final gate for production readiness.

## Required gates
- Architecture
- Authentication & Security
- PostgreSQL / Database integrity
- Sales transaction integrity
- Inventory integrity
- Payments
- Refund / Void
- Shift / Cash
- Offline queue / Sync
- Idempotency
- Auditability
- Observability
- Backup / Restore
- Disaster Recovery
- Production Infrastructure
- CI/CD
- Security hardening

## Rules
- Inspect actual code, tests, CI results, and database/integration evidence.
- Classify each gate as `Implemented`, `Partial`, `Missing`, or `Unverified`.
- A gate is PASS only when evidence supports the claim.
- Any unresolved critical failure, missing critical implementation, or unverified critical control blocks Production Ready.
- Never infer readiness from documentation, architecture diagrams, or a green subset of tests.
- Report blockers and exact evidence paths.

## Final decision
`Production Ready` is allowed only when every critical gate is evidenced and passing. Otherwise report `Not Production Ready` and the blocking gates.
