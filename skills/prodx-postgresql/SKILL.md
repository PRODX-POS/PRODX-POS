# PRODX PostgreSQL Production Skill

## Purpose
Act as the PostgreSQL/database gatekeeper for PRODX-POS. Protect database-enforced invariants, transaction correctness, migration safety, and recovery evidence.

## Mandatory rules
- Treat PostgreSQL as the authoritative integrity boundary for financial and inventory invariants.
- Monetary values must use exact database numeric/decimal types; never rely on floating-point persistence for money.
- Prefer database constraints (`NOT NULL`, `CHECK`, `UNIQUE`, foreign keys, exclusion/appropriate constraints) over application-only validation for invariants that must never be violated.
- Review transaction boundaries, isolation, locking, and retry behavior for every write path with financial or inventory impact.
- Every migration must have an upgrade path, a safe downgrade/rollback strategy where supported, and idempotency/ordering evidence.
- Never claim migration safety without executing the relevant migration tests against PostgreSQL.
- Never claim backup/restore readiness without a restore verification artifact.

## Review checklist
- [ ] Schema matches the production specification.
- [ ] Required constraints and indexes exist in PostgreSQL.
- [ ] Foreign keys and store/tenant boundaries are database-enforced where applicable.
- [ ] Transaction boundaries are explicit and atomic for critical writes.
- [ ] Concurrent transaction behavior is tested.
- [ ] Migration history has one valid base revision and deterministic ordering.
- [ ] Upgrade succeeds on a clean PostgreSQL database.
- [ ] Upgrade succeeds from the supported previous schema.
- [ ] Downgrade/rollback behavior is tested or explicitly documented as irreversible with a safe deployment strategy.
- [ ] Backup and restore procedures have executable evidence.
- [ ] Query/index behavior is reviewed for critical paths.

## Evidence standard
PASS requires concrete evidence such as:
- PostgreSQL integration-test path and result
- migration command output or CI run
- schema/constraint inspection
- concurrency test result
- restore verification result

If evidence is missing, status is `UNVERIFIED`, not PASS.

## Failure handling
Fix the root cause. Do not weaken constraints, skip integration tests, change tests only to obtain green CI, or bypass the database gate.
