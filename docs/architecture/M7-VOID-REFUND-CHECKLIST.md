# M7 Void / Refund Evidence Checklist

- [x] Authenticated routes require `pos.void` / `pos.refund`.
- [x] Store scope is checked against the authenticated principal.
- [x] Original sale payments remain immutable.
- [x] Refunds are separate immutable financial events.
- [x] Voids create explicit payment reversals for every original payment.
- [x] Refund/void mutations run in a PostgreSQL transaction.
- [x] Refund amount is bounded by captured payments.
- [x] Restock quantity is bounded by quantity sold.
- [x] Void restores all sold inventory.
- [x] Cash refunds/reversals require an active shift.
- [x] Inventory restoration is recorded in the inventory ledger.
- [x] Audit events are emitted inside the same transaction.
- [x] Idempotency is database-enforced for refund and void requests.
- [x] PostgreSQL constraints enforce payment-reversal bounds.
- [x] Integration tests cover refund and void persistence paths.

## Not yet proven

- [ ] CI execution on this branch.
- [ ] Real PostgreSQL migration execution in CI.
- [ ] Card/QR processor-side settlement/reversal evidence.
- [ ] HTTP route integration against the production runtime composition.
- [ ] Offline sync integration.
- [ ] Independent review / approval.
