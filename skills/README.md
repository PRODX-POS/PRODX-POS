# PRODX-POS Skill Pack

These repository-owned skills are review gates for AI and engineering work on PRODX-POS. They are instructions/checklists, not evidence that a gate has passed.

## Core gates
- `prodx-postgresql` — schema, constraints, transactions, migrations, recovery
- `prodx-financial-integrity` — money, sales, payments, refunds, voids, ledger
- `prodx-security` — authentication, authorization, secrets, store isolation
- `prodx-concurrency-idempotency` — races, retries, deduplication, offline replay
- `prodx-production-readiness` — cross-gate status and evidence rules

## Required evidence discipline
Every PASS claim must point to actual code/tests/CI/database/infrastructure evidence. Missing evidence is `UNVERIFIED`.

## Scope
These skills supplement the project specification and CI gates. They do not override architecture, security, database, integration-test, or release controls.
