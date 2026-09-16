# ADR-007 — M7 Void / Refund Accounting Boundary

## Decision

Original `prodx_payments` rows remain immutable sale facts. Refunds are recorded in `prodx_refunds`; voids are recorded in `prodx_voids` and reverse each original payment through `prodx_payment_reversals`.

All mutations execute inside one PostgreSQL transaction. Order, payment, store and user relationships are constrained by the existing organization/store foreign keys. Refund and reversal amounts are bounded by database-backed payment totals. Inventory restoration is recorded in the immutable inventory ledger.

## Authorization

HTTP routes require `pos.refund` or `pos.void`. The authenticated principal supplies the authorizing user identity; client-provided authorization identity is not trusted.

## Idempotency

Refund requests use `(store_id, idempotency_key)` uniqueness. Void requests use `(store_id, idempotency_key)` uniqueness plus one void per order. Repeated requests return the existing event rather than creating another financial effect.

## Inventory

Refund restock is explicitly requested and cannot exceed the quantity sold for each product. A void restores every order item. Stock mutation and ledger insertion are in the same transaction.

## Cash

Cash refunds and cash payment reversals create `cash_refund` movements in an active shift. Card/QR reversals are persisted as payment reversal facts; external processor settlement remains a separate integration responsibility and is not represented as completed merely by creating the database event.

## Limitations / next gates

This milestone does not claim external card/QR processor settlement, partial-refund UI integration, offline sync integration, or production readiness. Those require their own verified integration evidence.
