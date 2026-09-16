# prodx-financial-integrity

## Purpose
Protect monetary correctness across sale, payment, refund, and void flows.

## Rules
- Never use floating-point arithmetic for authoritative money.
- Sale and payment effects must be atomic.
- Duplicate requests must not duplicate financial effects.
- Refunds must never exceed refundable captured payment.
- Void requires explicit authorization and valid order state.
- Original financial facts remain immutable; reversals are separate events.
- Database invariants must back application checks.
- Concurrency behavior must be integration-tested.

## Checklist
- [ ] Exact decimal persistence.
- [ ] Integer minor-unit request validation.
- [ ] Atomic sale/payment/refund/void transaction.
- [ ] Refund ceiling enforced under concurrency.
- [ ] Idempotency tested.
- [ ] Payment reversal model preserves original payment facts.
- [ ] Audit evidence exists.
- [ ] PostgreSQL integration tests exist.

## Evidence requirements
PASS requires executable tests and CI evidence for claimed behavior; static code inspection is not sufficient for transaction correctness.

## Failure cases
- Double charge or double refund
- Refund above captured amount
- Mutable original payment record
- Client-controlled final amount
- Partial transaction commit
- Missing audit event
