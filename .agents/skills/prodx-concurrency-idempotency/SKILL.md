---
name: prodx-concurrency-idempotency
description: Concurrency, retry, idempotency, and distributed-failure engineering for POS operations.
---

# Concurrency + Idempotency

Design for retries and simultaneous requests. At-least-once delivery is normal; correctness means repeated delivery has one intended business effect.

## Idempotency
Every externally retryable command that can mutate money, inventory, cash, or durable business state should have a stable idempotency key and a clearly defined replay result. Enforce uniqueness at the authoritative persistence boundary. Do not rely on in-memory maps.

## Race analysis
For each command identify read-modify-write sequences and test simultaneous execution. Look for duplicate rows, lost updates, overselling, double payment, double refund, duplicate cash movement, and inconsistent audit events.

## Failure matrix
Analyze: request timeout, client retry, process crash before response, process crash after DB commit, DB deadlock, DB unavailable, provider timeout, network partition, duplicate queue delivery, and stale/offline client.

## Exactly-once effect
Do not promise magical exactly-once transport. Establish exactly-once business effect using durable identifiers, unique constraints, atomic state transitions, and safe replay semantics.

## Verification
Use real database integration tests for concurrency-sensitive behavior. A passing unit test that never exercises competing transactions is insufficient evidence.
