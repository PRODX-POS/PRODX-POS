# PRODX PostgreSQL Engineering Skill

## Purpose

Enforce PostgreSQL as the integrity boundary for PRODX-POS. Reviewers must verify implementation and evidence; documentation or prior claims are not evidence.

## Required rules

- Critical business invariants MUST be enforceable by PostgreSQL constraints where practical.
- Monetary values MUST use exact numeric/decimal representations; floating point MUST NOT be the persistence or authoritative calculation format.
- Multi-step financial and inventory mutations MUST use appropriate database transactions.
- Isolation and row-locking choices MUST be explicit for concurrent state transitions.
- Unique constraints MUST protect idempotency and other uniqueness invariants.
- Foreign keys MUST protect referential integrity unless a documented, evidence-backed exception exists.
- Migrations MUST be deterministic, reviewed, and safe for existing production data.
- Destructive schema changes MUST have an explicit rollout and recovery strategy.
- Indexes MUST support verified access patterns without silently weakening correctness.

## Evidence checklist

- [ ] Schema and constraints inspected.
- [ ] Relevant migrations inspected.
- [ ] Transaction boundaries inspected in application code.
- [ ] Concurrency behavior tested against real PostgreSQL.
- [ ] Migration verification exists in CI.
- [ ] Backup/restore implications are addressed where schema changes require them.
- [ ] No critical invariant depends solely on application-level validation.

## Failure cases to test

- Concurrent updates to the same stock/order/payment row.
- Duplicate insert attempts.
- Same idempotency key with identical payload.
- Same idempotency key with different payload.
- Transaction rollback after a partial failure.
- Migration against a populated database.
- Connection interruption during a transaction.

## Status rule

PASS requires concrete repository, test, CI, and database evidence appropriate to the control. Missing evidence is UNVERIFIED, not PASS.
