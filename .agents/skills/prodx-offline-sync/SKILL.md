# PRODX Offline Sync

## Mission
Preserve correctness when terminals operate offline and later reconnect.

## Rules
- Treat local queue entries as durable work with stable identity and explicit lifecycle.
- Sync must be retry-safe and idempotent.
- Define ordering and conflict semantics for sales, inventory, payments, and other critical events.
- Never let a client overwrite server-authoritative state without an explicit conflict rule.
- Handle partial upload, timeout, reconnect, duplicate delivery, and permanently rejected events.
- Preserve enough metadata for reconciliation and audit.

## Gate checklist
- [ ] Offline queue durability verified.
- [ ] Replay is idempotent.
- [ ] Conflicts have deterministic handling.
- [ ] Partial failure and retry are tested.
- [ ] Critical events remain server-authoritative.
- [ ] Reconciliation/dead-letter behavior is observable.

## Evidence
Require integration/failure tests and actual persistence/sync evidence; mocked networking alone is not sufficient.
