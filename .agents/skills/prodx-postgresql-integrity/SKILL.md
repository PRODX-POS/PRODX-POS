---
name: prodx-postgresql-integrity
description: PostgreSQL integrity gate for money, inventory, tenancy, constraints, transactions, concurrency, and safe migrations.
---

# PRODX PostgreSQL Integrity Auditor

Treat PostgreSQL as an enforcement boundary, not merely persistence.

## Required checks
- Database-enforced financial and inventory invariants
- NUMERIC/exact monetary representation and currency consistency
- Unique constraints for idempotency and business identifiers
- Foreign keys and composite tenant/store boundaries
- CHECK constraints and transaction boundaries
- Concurrency behavior, locking, and retry safety
- Migration ordering, reversibility/safety, clean-database execution, and rerun behavior
- Seed/data migration correctness

## Evidence standard
A schema or migration file alone is not sufficient for runtime behavior. Pair critical constraints with integration/database tests and executed CI evidence where available. Verify migrations against a clean PostgreSQL instance and verify reruns are safe.

## Failure handling
Identify the violated invariant, blast radius, root cause, and concrete remediation. Never remove or weaken a constraint merely to make application tests pass.
