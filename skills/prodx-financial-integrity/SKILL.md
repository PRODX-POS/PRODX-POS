# PRODX Financial Integrity Skill

## Purpose
Audit every sale, payment, refund, void, discount, tax, and cash-affecting operation for monetary correctness and atomicity.

## Mandatory rules
- Represent money exactly; avoid binary floating-point for monetary calculations or persistence.
- Keep sale/order state, payment effects, and financial ledger effects atomic where business rules require atomicity.
- Server-side calculations are authoritative; never trust client totals, tax, discount, payment status, or authorization claims.
- Every retriable financial command must have an idempotency strategy that prevents duplicate effects.
- Refunds must be bounded by refundable amounts and business state.
- Void/refund authorization must be enforced server-side and audited.
- Financial history must be append-only/immutable where the specification requires an audit trail.
- Database constraints must enforce invariants that cannot safely be left to application code.

## Critical scenarios
- Sale submission repeated with the same idempotency key.
- Two concurrent submissions for the same order/payment.
- Partial failure after payment intent/record creation.
- Retry after timeout with unknown server outcome.
- Refund race against another refund.
- Void after settlement or outside allowed authorization.
- Discount/tax rounding at line and transaction totals.
- Cross-store access to financial records.

## Review checklist
- [ ] Money uses exact decimal representation end-to-end.
- [ ] Server recomputes authoritative totals.
- [ ] Sale/payment state transitions are explicit and validated.
- [ ] Payment duplication is prevented under concurrency.
- [ ] Refund amount cannot exceed refundable balance.
- [ ] Void/refund authorization is enforced and audited.
- [ ] Financial writes are atomic across required records.
- [ ] Store isolation is enforced.
- [ ] Immutable ledger/audit requirements are enforced.
- [ ] PostgreSQL integration tests cover failure and concurrency cases.

## Evidence standard
PASS requires test and implementation evidence. At minimum cite:
- critical service/route path
- database constraint or transaction boundary
- integration/concurrency test
- CI result

No evidence means `UNVERIFIED`.

## Failure handling
Never fix financial integrity by weakening validation or deleting failed records. Preserve the audit trail and repair the transaction boundary, invariant, or idempotency mechanism at the root cause.
