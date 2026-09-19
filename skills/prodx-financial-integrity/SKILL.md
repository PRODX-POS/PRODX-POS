# PRODX Financial Integrity Skill

## Purpose

Protect money movement and transaction history from duplication, loss, unauthorized mutation, precision errors, and inconsistent state.

## Required rules

- Money MUST use exact decimal/integer-minor-unit semantics appropriate to the domain; binary floating point MUST NOT be authoritative for monetary values.
- Sale, payment, refund, and void state transitions MUST be atomic where the business invariant requires atomicity.
- Payment effects MUST be idempotent under retries and duplicate submissions.
- Refunds MUST NOT exceed the refundable amount, including under concurrent requests.
- Void/refund authorization MUST be enforced server-side.
- Transaction history MUST NOT be silently rewritten or deleted to hide financial effects.
- Financial state MUST be server-authoritative; clients MUST NOT be trusted for final totals or authorization.
- Store/organization scope MUST be enforced on every financial resource and mutation.

## Minimum evidence checklist

- [ ] Monetary representation inspected in schema and application code.
- [ ] Checkout transaction boundary verified.
- [ ] Payment idempotency verified.
- [ ] Refund/void invariants verified.
- [ ] Database constraints verified for critical uniqueness/integrity rules.
- [ ] Concurrent refund/payment tests exist and run against real PostgreSQL.
- [ ] Audit evidence exists for material financial transitions.
- [ ] CI results for the relevant tests are verified.

## Failure cases to test

- Duplicate checkout request.
- Same idempotency key with a changed payload.
- Two concurrent refunds that together exceed the refundable amount.
- Payment succeeds but the client times out before receiving the response.
- Failure after payment persistence but before response delivery.
- Unauthorized cross-store refund/void.
- Rounding/precision edge cases.

## Gate rule

A green unit-test suite alone does not establish financial integrity. PASS requires concrete implementation plus integration/concurrency evidence.
