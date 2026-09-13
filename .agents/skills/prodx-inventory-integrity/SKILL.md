# PRODX Inventory Integrity

## Mission
Ensure stock remains correct under normal, concurrent, offline, and recovery scenarios.

## Rules
- Inventory mutations must be server-authoritative and transactional.
- Prevent invalid negative stock unless an explicit domain rule permits it.
- Model stock movements with traceable causes and references.
- Consider concurrent sales, returns, adjustments, and sync replay as first-class cases.
- Reconciliation must be possible from authoritative records.
- Do not repair inventory by silently overwriting history; preserve the audit trail.

## Gate checklist
- [ ] Stock decrement/increment invariants enforced.
- [ ] Concurrent mutation tests exist.
- [ ] Returns/refunds correctly affect stock where applicable.
- [ ] Offline replay cannot double-decrement stock.
- [ ] Reconciliation path is defined and testable.

## Evidence
Require database constraints/transactions plus integration evidence for critical inventory claims.
