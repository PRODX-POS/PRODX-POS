# PRODX Financial Integrity

## Mission
Prevent loss, duplication, corruption, or unauthorized mutation of monetary value.

## Rules
- Use exact monetary representation; do not use binary floating point for persisted or authoritative money calculations.
- Treat sale, payment, refund, and void transitions as explicit stateful business operations.
- Critical financial mutations must be atomic and server-authoritative.
- Replays and duplicate submissions must be idempotent and must not create duplicate financial effects.
- Refunds cannot exceed refundable amounts; void/refund authorization must be enforced.
- Preserve immutable or append-only financial history where the domain requires it.
- Validate totals from authoritative line items and pricing rules rather than trusting client totals.

## Gate checklist
- [ ] Monetary precision invariant verified.
- [ ] Sale/payment atomicity verified.
- [ ] Duplicate payment/retry behavior verified.
- [ ] Refund and void bounds/authorization verified.
- [ ] Concurrent transaction behavior verified.
- [ ] Financial history/auditability verified.

## Evidence
PASS requires integration/database tests demonstrating the invariants. A unit test alone is insufficient for transaction and persistence claims.
