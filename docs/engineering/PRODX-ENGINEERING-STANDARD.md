# PRODX-POS Production Engineering Standard

## Purpose

This document is the repository-level operating standard for developing and auditing PRODX-POS toward real Production readiness.

The source-of-truth hierarchy is:

1. Actual repository code and configuration
2. Actual tests and integration evidence
3. Actual CI/CD results
4. Actual database/integration evidence
5. Documentation and specifications

Prior conversation, assumptions, or memory are not evidence of implementation.

## Non-negotiable principles

- Financial Integrity
- Inventory Integrity
- Security by Default
- Server Authority
- Offline Resilience
- Auditability
- Idempotency
- Store Isolation
- Monetary Precision
- Database-enforced Invariants
- Safe Migrations
- Observability
- Backup & Recovery

## Required production gates

Production readiness must cover all of these domains:

- Authentication & Security
- PostgreSQL / Database integrity
- Sales transaction integrity
- Inventory integrity
- Payments
- Refund / Void
- Shift / Cash
- Offline queue / Sync
- Idempotency
- Audit
- Observability
- Backup / Restore
- Disaster Recovery
- Production Infrastructure
- CI/CD
- Security hardening

A green CI run or AI review result alone is not Production Ready evidence.

## Evidence-first status model

Every audit item must be classified as exactly one of:

- **Implemented** — implementation exists and the required evidence is verified.
- **Partial** — some required behavior exists, but the complete gate is not satisfied.
- **Missing** — required implementation/evidence is absent.
- **Unverified** — implementation may exist, but the required evidence was not verified.

### PASS rule

No gate may be marked PASS without concrete evidence. Evidence should identify the relevant:

- source file / implementation
- test or integration test
- database migration / constraint where applicable
- CI workflow and run/result where applicable
- runtime or database integration evidence where applicable

If required evidence is unavailable, the status is **UNVERIFIED**, not PASS.

## Engineering skill pack

The repository skill model should be organized around production gates. Each skill must contain rules, checklists, evidence requirements, and failure cases; it must not merely be explanatory documentation.

Recommended skill set:

```text
skills/
├── prodx-architecture/
├── prodx-security/
├── prodx-postgresql/
├── prodx-financial-integrity/
├── prodx-inventory-integrity/
├── prodx-idempotency/
├── prodx-offline-sync/
├── prodx-testing/
├── prodx-observability/
├── prodx-ci-cd/
├── prodx-backup-recovery/
└── prodx-production-readiness/
```

## Skill priorities

### Priority 1 — mandatory foundation

1. `prodx-postgresql` — transactions, isolation, locking, constraints, migrations, rollback, concurrency, backup/restore, query/index analysis.
2. `prodx-financial-integrity` — exact money representation, atomic sale/payment/refund/void, duplicate prevention, immutable transaction history, concurrency, database invariants.
3. `prodx-security` — authentication, authorization, session/token lifecycle, password hashing, RBAC, store/tenant isolation, privilege escalation prevention, secure defaults.
4. `prodx-concurrency-idempotency` — race prevention, idempotency keys, double-submit/double-charge prevention, exactly-once effect, failure recovery.
5. `prodx-production-readiness` — evidence aggregation and final gate assessment.

### Priority 2 — production resilience

6. `prodx-offline-sync` — queue, retry, conflict resolution, idempotent sync, ordering, network partitions.
7. Distributed systems practices — at-least-once delivery, exactly-once effect, consistency, races, failure recovery, distributed coordination.
8. `prodx-observability` — structured logs, metrics, tracing, correlation/request IDs, audit logs, alerting.
9. `prodx-testing` — unit/integration/E2E, PostgreSQL integration, concurrency, failure injection, property-based and contract testing.

### Priority 3 — delivery and operations

10. `prodx-ci-cd` — pipeline design, security/dependency scanning, migration verification, integration gates, artifact promotion, rollback.
11. Production Infrastructure — Docker/Linux, reverse proxy, TLS, secrets management, health/readiness, resource limits.
12. `prodx-backup-recovery` / Disaster Recovery — RPO/RTO, automated backups, restore verification, point-in-time recovery, failure scenarios, DR drills.

## Recommended learning / engineering order

```text
PostgreSQL Deep Dive
        ↓
Transaction & Concurrency
        ↓
Financial / Inventory Integrity
        ↓
Authentication + Authorization
        ↓
Idempotency + Offline Sync
        ↓
Integration / Failure Testing
        ↓
Observability
        ↓
CI/CD + Production Infrastructure
        ↓
Backup / Restore + Disaster Recovery
```

Database and transaction correctness are foundational to financial and inventory integrity.

## Financial integrity minimum checklist

A financial-integrity review must verify at minimum:

- [ ] Money uses exact decimal representation.
- [ ] Monetary calculations do not rely on floating-point representation.
- [ ] Sale/payment operations are atomic where required.
- [ ] Duplicate requests cannot create duplicate payment effects.
- [ ] Refund cannot exceed refundable amount.
- [ ] Void requires appropriate authorization.
- [ ] Transaction history cannot be silently rewritten.
- [ ] Concurrent requests are covered by integrity tests.
- [ ] Database constraints enforce critical invariants.
- [ ] Integration tests provide real evidence.

## Definition of Done

```text
SPEC
  → ARCHITECTURE PASS
  → CODE IMPLEMENTED
  → DATABASE PASS
  → SECURITY PASS
  → INTEGRITY PASS
  → INTEGRATION / E2E PASS
  → AI REVIEW PASS
  → CI/CD PASS
  → EVIDENCE COMPLETE
  → MERGE
  → POST-MERGE VERIFICATION
```

The sequence is a gate model, not a reason to bypass an incomplete gate.

## Human approval boundary

The target operating model is automated engineering with a narrow human control boundary: the human approves or rejects changes after machine-verifiable gates and evidence are complete.

Automation must never weaken security, tests, database constraints, branch gates, or production safeguards in order to obtain a PASS.

## Failure handling

- Never hide a failure.
- Never weaken or disable CI/CD gates to make a check pass.
- Never modify tests merely to conceal a root cause.
- Fix the root cause first.
- Do not declare Production Ready without evidence for all critical gates.
- If evidence is missing, report the gap explicitly as Unverified/Missing/Partial as appropriate.

## Audit operating procedure

For every repository audit:

1. Inspect the actual repository state.
2. Compare implementation against the specification and required gates.
3. Inspect tests and CI/CD.
4. Inspect database/integration evidence where relevant.
5. Classify every required area as Implemented / Partial / Missing / Unverified.
6. Record concrete evidence for PASS.
7. Re-check the actual target branch after convergence/merge.
8. Do not infer status from earlier reports.

## Current project direction

PRODX-POS is being developed as a production-oriented POS. The repository must continue to be treated as not Production Ready until all critical production gates above have verified evidence on the relevant production branch.
