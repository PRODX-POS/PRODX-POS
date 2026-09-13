---
name: prodx-postgresql-integrity
description: High-assurance PostgreSQL engineering for PRODX-POS, including invariants, concurrency, migrations, indexes, and recovery.
---

# PostgreSQL Integrity

Treat PostgreSQL as a correctness boundary, not a passive persistence layer.

## Inspect
- Schema, migrations, foreign keys, UNIQUE/CHECK/NOT NULL constraints, generated values, and triggers.
- Transaction boundaries and isolation levels around critical operations.
- Locking strategy and query predicates for concurrent writes.
- Numeric types for money/quantity and timestamp/time-zone semantics.
- Indexes supporting critical constraints and hot paths.
- Migration ordering, compatibility with old/new application versions, and rollback strategy.

## Required invariants
- Referential integrity is database-enforced where practical.
- Monetary values use exact numeric representation; no floating-point storage/calculation for money.
- Critical uniqueness and idempotency keys are enforced by constraints.
- Stock cannot become invalid through concurrent transactions.
- Cross-store access cannot be achieved by omitting a tenant/store predicate.

## Concurrency review
For each critical write, reason about two or more simultaneous transactions. Check lost updates, write skew, duplicate inserts, deadlocks, phantom assumptions, and retry behavior. Require an integration test against real PostgreSQL for non-trivial concurrency claims.

## Migration gate
Migrations must be deterministic, reviewable, forward-compatible where rolling deploys require it, safe for existing data, and tested on a representative database. Never claim rollback safety without evidence.
