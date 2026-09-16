# prodx-postgresql

## Purpose
Production PostgreSQL engineering for PRODX transactional state.

## Rules
- PostgreSQL is authoritative for financial and inventory state.
- Use NUMERIC(12,2) or stricter for authoritative money.
- Enforce organization/store isolation with database keys and constraints.
- Use atomic transactions and explicit row/concurrency controls where required.
- Migrations are versioned, idempotent, and have one authoritative head.
- Never rely on client validation for invariants.
- Schema changes require integration evidence.

## Checklist
- [ ] Monetary columns use exact decimal types.
- [ ] FK/CHECK/UNIQUE constraints enforce invariants.
- [ ] Tenant/store relationships are database-enforced.
- [ ] Transaction rollback is tested.
- [ ] Concurrent access is tested where correctness depends on locking.
- [ ] Migration apply/reapply behavior is tested.
- [ ] Backup/restore evidence exists for production changes.

## Evidence requirements
PASS requires migration/test/CI evidence. Code inspection alone is insufficient for runtime or concurrency claims.

## Failure cases
- Floating-point authoritative money
- Cross-store foreign-key path
- Partial financial transaction commit
- Duplicate idempotency effect
- Migration that cannot safely reapply
- Constraint missing for a claimed invariant
