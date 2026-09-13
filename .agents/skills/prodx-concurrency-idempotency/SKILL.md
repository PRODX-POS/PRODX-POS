# PRODX Concurrency and Idempotency

## Mission
Make retries, duplicates, races, and partial failures safe.

## Rules
- Identify every operation that may be retried, replayed, or submitted concurrently.
- Use stable idempotency keys and database uniqueness/atomicity where appropriate.
- Design for at-least-once delivery while guaranteeing exactly-once business effect for critical operations.
- Analyze read-modify-write races and use appropriate transactions/locks/conditional updates.
- Never rely on an in-memory flag as the sole duplicate-prevention mechanism for durable operations.
- Test timeout-after-commit and retry-after-unknown-result scenarios.

## Gate checklist
- [ ] Idempotency scope and key semantics are explicit.
- [ ] Duplicate requests produce one durable effect.
- [ ] Concurrent requests cannot violate invariants.
- [ ] Retry after ambiguous failure is safe.
- [ ] Database uniqueness/transaction guarantees back application logic.

## Evidence
PASS requires concurrency/idempotency integration evidence, preferably against the real database engine.
