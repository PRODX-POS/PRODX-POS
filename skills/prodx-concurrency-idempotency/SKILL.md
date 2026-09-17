# PRODX Concurrency & Idempotency Skill

## Purpose
Find race conditions, duplicate effects, retry hazards, and ordering bugs across sales, payments, inventory, offline sync, and background jobs.

## Mandatory rules
- Design for retries and at-least-once delivery; exactly-once effect must be achieved through durable state and constraints, not wishful transport semantics.
- Idempotency keys must be scoped to the correct actor/store/operation and backed by durable uniqueness where required.
- Check-then-insert/update patterns are unsafe when uniqueness or locking is required; use atomic database operations, unique constraints, or appropriate locking.
- A successful response must correspond to a durable committed effect before the command is acknowledged.
- Retries after timeout must converge to the same business result without duplicate financial/inventory effects.
- Ordering requirements must be explicit for commands that depend on sequence.
- Distributed locks are not a substitute for database invariants.

## Review checklist
- [ ] Every retryable critical command has an idempotency key or equivalent deduplication mechanism.
- [ ] Idempotency uniqueness is enforced durably in PostgreSQL where required.
- [ ] Concurrent duplicate requests are tested.
- [ ] Transaction isolation/locking is appropriate to the invariant.
- [ ] Partial failures do not leave duplicate or orphaned effects.
- [ ] Offline replay is safe under repeated delivery.
- [ ] Command ordering and conflict behavior are explicit.
- [ ] Cross-store keys cannot collide or leak effects across stores.
- [ ] Integration tests exercise real PostgreSQL concurrency.

## Evidence standard
PASS requires a real concurrency/idempotency test result plus the database or service implementation that enforces the invariant. Unit tests alone are insufficient for database race claims.

If concurrency behavior has not been executed against the supported PostgreSQL environment, mark `UNVERIFIED`.

## Failure handling
Fix atomicity, constraints, transaction boundaries, or durable state. Never solve a race by adding sleeps, arbitrary retries, test-only branching, or disabling the failing test.
