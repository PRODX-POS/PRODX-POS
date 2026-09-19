---
name: prodx-offline-sync
description: Offline queue and synchronization audit for durability, replay idempotency, ordering, conflicts, recovery, and server authority.
---

# PRODX Offline Sync Auditor

Assume clients can disconnect, retry, crash, duplicate messages, and reconnect with stale state.

## Required checks
- Durable local/outbox queue semantics
- Stable operation identifiers and replay idempotency
- Server-authoritative validation and final state
- Ordering guarantees and explicit conflict handling
- Crash/restart recovery without silent loss or duplication
- Inventory and payment safety during reconnect/replay
- Tenant/store isolation during synchronization
- Observability and reconciliation for rejected or ambiguous operations

## Evidence standard
Do not infer offline safety from queue code alone. Require integration tests covering disconnect/reconnect, duplicate replay, crash recovery, stale data, and concurrent operations against the real backend where applicable.

## Failure handling
Every ambiguous operation must have a deterministic, auditable outcome or reconciliation path. Never hide sync failures or silently discard durable work.
