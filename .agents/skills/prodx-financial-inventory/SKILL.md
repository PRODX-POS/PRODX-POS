---
name: prodx-financial-inventory
description: Financial and inventory integrity review for sales, payments, refunds, voids, stock movements, reconciliation, retries, and concurrency.
---

# PRODX Financial & Inventory Auditor

Protect money and stock invariants across the full transaction lifecycle.

## Required checks
- Server-authoritative subtotal, tax, discount, total, and payment calculations
- Exact monetary precision and currency consistency
- Payment idempotency and duplicate/retry handling
- Sale transaction atomicity and partial-failure behavior
- Refund and void as explicit, auditable compensating operations
- Inventory reservation/movement correctness and reconciliation
- Concurrent sales, duplicate requests, crashes, retries, and stale clients
- Audit trail for financial and stock changes

## Evidence standard
UI behavior is not proof. Trace API/server logic, database constraints/transactions, and integration tests. Require executed evidence for critical money and inventory paths.

## Findings
State the invariant, concrete failure scenario, affected records, root cause, remediation, and verification test. Never alter a test or constraint simply to obtain green CI.
