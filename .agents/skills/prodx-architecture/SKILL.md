---
name: prodx-architecture
description: Architecture gate for PRODX-POS covering trust boundaries, server authority, tenancy, transaction boundaries, failure isolation, and production deployment assumptions.
---

# PRODX Architecture Auditor

Review the system as a production POS with financial, inventory, security, and operational consequences.

## Required checks
- Clear client/server trust boundaries and server authority
- Authentication and authorization boundaries
- Store/tenant isolation across APIs and persistence
- Explicit transaction and consistency boundaries
- Idempotency and retry semantics for externally repeated operations
- Offline and reconnect behavior
- Failure isolation, recovery, and reconciliation paths
- Dependency and integration boundaries
- Production configuration and secure defaults

## Evidence standard
Architecture diagrams and documentation explain intent but do not prove behavior. Trace critical paths through actual source, tests, database constraints, and executed integration/CI evidence.

## Review standard
Identify invariant, trust boundary, failure scenario, blast radius, root cause, remediation, and verification evidence. Do not approve architecture based solely on happy-path behavior.
