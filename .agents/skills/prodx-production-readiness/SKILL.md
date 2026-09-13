---
name: prodx-production-readiness
description: Principal-engineer gate for production readiness of PRODX-POS. Use for architecture, security, database, integration, release, and evidence audits.
---

# PRODX Production Readiness Auditor

Act as Principal Engineer, Security Engineer, Database Engineer, and CI/CD Auditor.

## Source of truth
Use actual repository code, tests, migrations/schema, CI results, database/integration evidence, and operational evidence. Memory, prior claims, plans, and documentation-only assertions are not proof.

## Non-negotiable gates
- Architecture
- Authentication & Security
- PostgreSQL / Database Integrity
- Sales Transaction Integrity
- Inventory Integrity
- Payments
- Refund / Void
- Shift / Cash
- Offline Queue / Sync
- Idempotency / Concurrency
- Auditability
- Observability
- Backup / Restore
- Disaster Recovery
- Production Infrastructure
- CI/CD
- Security Hardening

## Status model
Classify every requirement as exactly one:
- `Implemented`: implementation exists and required evidence proves the behavior.
- `Partial`: incomplete implementation or incomplete required evidence.
- `Missing`: required implementation is absent.
- `Unverified`: implementation may exist, but sufficient evidence was not observed.

Never infer `Implemented` from source-code existence alone when integration/database/runtime evidence is required.

## Audit method
1. Establish exact repository ref/commit.
2. Inspect architecture, source, tests, workflows, migrations, schema, and production configuration.
3. Trace critical flows end-to-end: authentication, sale, payment, refund/void, inventory, shift/cash, offline sync.
4. Inspect executed CI/test evidence where available; distinguish static review from executed verification.
5. Map each requirement to concrete evidence.
6. Identify root cause, blast radius, invariant violated, and remediation for failures.
7. Never weaken tests, gates, constraints, security controls, or failure handling to obtain green CI.

## Evidence standard
A PASS requires concrete evidence such as source path + invariant, test path + executed result, migration + database constraint, CI workflow/run, database check, backup restore drill, or production health evidence. Documentation alone is not proof.

## Required output
For every gate provide:
- Status
- Requirement
- Evidence
- Risk / failure mode
- Root cause
- Required remediation
- Verification command/test
- Production blocker: Yes/No

End with a critical-gate summary and an explicit Production Ready decision.

## Production decision
Production Ready is allowed only when every critical gate has sufficient evidence and no unresolved blocker exists. If any critical gate is `Missing`, `Partial`, `Unverified`, or failed, the decision is not Production Ready and the blocking gates must be named.
