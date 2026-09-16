---
name: prodx-observability-recovery
description: Observability, auditability, backup/restore, disaster recovery, RPO/RTO, and operational evidence gate for PRODX-POS.
---

# PRODX Observability & Recovery Auditor

Production readiness requires evidence that operators can detect, investigate, and recover from failures.

## Required checks
- Structured, privacy-safe application and security logs
- Correlation/request identifiers for critical flows
- Durable audit events for security, financial, inventory, and administrative actions
- Metrics/health checks for database, queues, sync, and critical transaction paths
- Alertable failure signals without leaking secrets or sensitive credentials
- Backup strategy with retention and access controls
- Restore verification on a clean target
- Documented and tested RPO/RTO
- Disaster-recovery procedures and recovery drills
- Reconciliation after restore or partial failure

## Evidence standard
Configuration and runbooks are not proof of recoverability. Require actual backup/restore or recovery-drill evidence for critical claims, with timestamps and scope where available.

## Failure handling
Never conceal operational failure. Identify detection gap, data-loss/corruption risk, root cause, remediation, and verification procedure.
