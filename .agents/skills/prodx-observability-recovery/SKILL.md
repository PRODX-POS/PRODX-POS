---
name: prodx-observability-recovery
description: SRE, auditability, backup, restore, disaster recovery, and production operations skill for PRODX-POS.
---

# Observability + Recovery

A production system must make failures visible and recoverable.

## Observability
Critical commands should emit structured, privacy-safe logs with correlation/request identifiers and durable business identifiers where appropriate. Track latency, error rate, retries, queue depth, DB health, payment failures, inventory anomalies, and reconciliation mismatches.

## Auditability
Audit security-sensitive and financial state transitions with actor, store, operation, target, timestamp, outcome, and correlation context. Audit records must not become a covert mechanism for storing secrets or mutable truth.

## Backup
Define backup scope, frequency, retention, encryption, access control, and restoration procedure. Backups that have never been restored are not verified recovery evidence.

## Disaster recovery
Define RPO/RTO and test realistic scenarios: database loss, corrupted deployment, secret rotation failure, region/host outage, queue backlog, and partial dependency failure. Capture actual recovery duration and data-loss observations.

## Production readiness
Health checks must distinguish process liveness from dependency readiness. Alerts should be actionable and tied to business impact. Document rollback and recovery paths before declaring release readiness.
