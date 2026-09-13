# PRODX PostgreSQL

## Mission
Make PostgreSQL the enforcement boundary for durable integrity.

## Rules
- Inspect schema, migrations, indexes, constraints, functions, and transaction usage before changing data behavior.
- Prefer database-enforced invariants: PK/FK, UNIQUE, CHECK, NOT NULL, appropriate exclusion/partial constraints, and transactional writes.
- Use exact monetary types appropriate to the existing schema; never introduce floating-point storage for money.
- Analyze transaction isolation, locking, race windows, and retry behavior for concurrent writes.
- Migrations must be forward-safe, deterministic, reviewable, and have a rollback/recovery story where feasible.
- Never claim backup/restore capability from configuration alone; require actual restore evidence.

## Gate checklist
- [ ] Schema invariants are enforced in PostgreSQL.
- [ ] Critical write paths are atomic.
- [ ] Concurrent access behavior is tested.
- [ ] Migration is safe and tested against representative data.
- [ ] Index/query impact reviewed for critical paths.
- [ ] Backup and restore evidence exists where required.

## Evidence
Record exact migration/schema paths, integration tests, CI results, and database execution evidence. Documentation alone is not PASS.
