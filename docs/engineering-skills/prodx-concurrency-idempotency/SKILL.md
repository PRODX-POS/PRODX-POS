# prodx-concurrency-idempotency

## Purpose
Prevent duplicate effects and race-condition failures in concurrent POS operations.

## Rules
- Idempotency keys must be scoped to the correct tenant/store boundary.
- Database uniqueness is the final duplicate-effect barrier.
- Lock the authoritative row before calculating remaining financial capacity.
- Check and write the effect inside one transaction.
- Retries must return the prior effect rather than repeat it.
- Concurrency correctness must be demonstrated against PostgreSQL.

## Checklist
- [ ] Idempotency key is persisted.
- [ ] Unique constraint prevents duplicate effects.
- [ ] Authoritative row is locked before balance calculation.
- [ ] Retry behavior is tested.
- [ ] Concurrent identical requests are tested.
- [ ] Cross-store idempotency collision is rejected or isolated.
- [ ] Transaction rollback leaves no partial effect.

## Evidence requirements
PASS requires executable concurrent integration evidence. Sequential unit tests alone are insufficient.

## Failure cases
- Double refund from concurrent requests
- Duplicate void
- Idempotency key shared across stores
- Race between balance check and write
- Retry creating a second effect
