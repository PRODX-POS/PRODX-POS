# PRODX Concurrency and Idempotency Skill

## Purpose

Prevent duplicate business effects and race-condition corruption across retries, concurrent requests, reconnects, and partial failures.

## Required rules

- Every externally retryable mutation that can create a business effect MUST have an explicit idempotency strategy.
- Idempotency identity MUST be scoped to the correct store/tenant and operation.
- The database MUST enforce uniqueness for critical idempotency invariants.
- Replayed requests MUST return the original committed effect only when the request intent matches the persisted intent.
- Same-key/different-payload requests MUST be rejected deterministically.
- Locking/isolation MUST cover the read-modify-write sequence for state transitions vulnerable to races.
- Exactly-once delivery is not assumed; the design MUST provide exactly-once business effect where required.
- Retry and failure handling MUST be safe after timeout, connection loss, worker restart, and partial completion.

## Evidence checklist

- [ ] Idempotency key lifecycle inspected.
- [ ] Request-intent/fingerprint semantics inspected where required.
- [ ] Database uniqueness constraint verified.
- [ ] Locking/isolation behavior verified.
- [ ] Duplicate and mismatch tests verified.
- [ ] Concurrent-request tests verified against real PostgreSQL.
- [ ] Recovery after client timeout/worker restart tested.

## Failure cases to test

- Identical request replay.
- Same key with different payload.
- Two simultaneous identical requests.
- Two simultaneous conflicting state transitions.
- Retry after server-side commit but before client response.
- Worker/process restart during processing.
- Network partition and delayed replay.

## Gate rule

A code path that appears idempotent is not enough. PASS requires database enforcement and executable concurrency/replay evidence where the risk applies.
