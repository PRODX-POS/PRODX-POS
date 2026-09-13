---
name: prodx-offline-sync
description: Offline-first POS resilience skill for durable queues, replay, conflicts, ordering, and reconciliation.
---

# Offline Sync

Offline mode is a failure mode of the network, not permission to weaken server authority.

## Queue contract
Every queued command needs a durable client/device identifier, command identifier, creation metadata, payload version, and retry state. The queue must survive application restart and transient failures.

## Replay
Replay must be idempotent. The server validates authorization, business rules, current state, and store scope exactly as for online requests. Never accept client-calculated authoritative totals or stock as truth merely because the request was created offline.

## Ordering and conflicts
Define which operations require ordering and which are commutative. Detect stale versions and conflicting updates explicitly. Never silently overwrite server state when a financial or inventory invariant could be violated.

## Recovery
Specify behavior for permanent rejection, malformed commands, expired authorization, duplicate commands, partial batch success, and device clock skew. Failed commands must remain auditable and diagnosable.

## Verification
Test network loss, reconnect storms, duplicate replay, out-of-order replay, app restart, device restart, server retry, and concurrent online/offline operations against real backend persistence.
