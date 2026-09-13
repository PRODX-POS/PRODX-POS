# PRODX-POS Engineering Skill Pack

These repository-local skills guide AI agents working on PRODX-POS. They are guardrails, not evidence that a gate has passed.

## Mandatory operating rules

1. Inspect the actual repository, tests, CI, and database/integration evidence before making claims.
2. Classify findings as `Implemented`, `Partial`, `Missing`, or `Unverified`.
3. A `PASS` requires concrete evidence: file/path, test or CI result, and relevant database/integration evidence where applicable.
4. Never weaken or remove architecture, security, database, integration-test, or CI/CD gates to make work pass.
5. Fix root causes; do not alter tests merely to hide failures.
6. Preserve server authority, store isolation, monetary precision, idempotency, auditability, offline resilience, and database-enforced invariants.
7. Do not declare Production Ready while any critical gate lacks evidence or has an unresolved failure.

## Skills

- `prodx-architecture` — architecture boundaries and server authority
- `prodx-security` — authentication, authorization, secrets, isolation, hardening
- `prodx-postgresql` — schema, constraints, transactions, migrations, recovery
- `prodx-financial-integrity` — monetary correctness and sale/payment/refund/void invariants
- `prodx-inventory-integrity` — stock correctness, concurrency, reconciliation
- `prodx-concurrency-idempotency` — duplicate requests, races, retries, exactly-once effects
- `prodx-offline-sync` — offline queue, replay, conflict and recovery semantics
- `prodx-testing` — unit/integration/E2E/concurrency/failure testing
- `prodx-observability` — logs, metrics, tracing, audit and alerting
- `prodx-ci-cd` — CI gates, supply-chain checks, migration validation and delivery safety
- `prodx-backup-recovery` — backup, restore, RPO/RTO and disaster recovery
- `prodx-production-readiness` — final evidence-based production gate

Apply the narrowest relevant skills to every change; for financial, inventory, auth, sync, migration, or production-readiness work, apply all related skills before declaring completion.
