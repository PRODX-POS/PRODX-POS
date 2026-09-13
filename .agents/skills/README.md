# PRODX High-Assurance Engineering Skills

This directory contains reusable engineering skills for developing and auditing PRODX-POS at production assurance level.

| Skill | Primary gate |
|---|---|
| `prodx-production-readiness` | Overall production gate + evidence discipline |
| `prodx-postgresql-integrity` | Database integrity, transactions, migrations |
| `prodx-financial-inventory` | Money, payments, refunds, inventory |
| `prodx-security` | Authentication, authorization, store isolation |
| `prodx-concurrency-idempotency` | Retries, races, duplicate effects |
| `prodx-offline-sync` | Offline queue, replay, conflict, recovery |
| `prodx-testing-ci` | Integration tests, CI/CD fail-closed gates |
| `prodx-observability-recovery` | Audit, telemetry, backup, DR |
| `prodx-code-review` | Adversarial/root-cause review |

## Operating rule
These skills are evidence-driven. They must not be used to infer implementation status. When evidence is absent, classify the requirement as `Unverified`.

## Critical principle
A feature is not production-ready merely because its code exists or unit tests pass. Critical claims require the appropriate integration, database, security, CI, or recovery evidence.
