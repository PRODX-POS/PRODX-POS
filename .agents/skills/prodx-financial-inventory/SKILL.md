---
name: prodx-financial-inventory
description: Financial and inventory integrity skill for POS transaction lifecycles, reconciliation, refunds, voids, and stock movements.
---

# Financial + Inventory Integrity

Review POS flows as accounting-like state transitions.

## Sale
Verify that sale creation, line items, totals, tax/discount rules, payment state, inventory mutation, and audit event have explicit consistency boundaries. Identify which state is authoritative and ensure clients cannot override server-calculated amounts.

## Payments
- Recompute payable amount server-side.
- Use exact monetary arithmetic.
- Bind payment attempts to a unique business/idempotency key.
- Prevent duplicate capture effects on retries.
- Persist provider/reference identifiers with uniqueness where appropriate.
- Define behavior for timeout after provider acceptance.

## Refund / void
Verify authorization, refundable/voidable state, amount limits, original transaction linkage, duplicate-request behavior, and immutable audit history. Partial refunds must not permit total refunded amount to exceed the captured amount.

## Inventory
Model stock as authoritative server-side state plus an auditable movement history. Check concurrent deductions, negative stock policy, adjustment authorization, returns, cancellation, and reconciliation. Never trust a client-provided current stock value.

## Reconciliation
Define invariants that can be recomputed from persisted records. Test mismatches between sales, payments, refunds, and inventory. A reconciliation result is evidence; a UI balance alone is not proof of integrity.

## Failure cases
Explicitly test duplicate requests, retries, process crashes, DB rollback, payment timeout, offline replay, concurrent sales, partial failure, and stale clients.
