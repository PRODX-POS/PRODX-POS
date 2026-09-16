# PRODX POS Production Readiness Gates

This checklist is evidence-driven. A gate is PASS only when repository code, tests, CI, database/integration evidence, or production operational evidence proves the requirement. Do not infer PASS from types, interfaces, mocks, or documentation alone.

## Critical gates

| Gate | Required evidence | Status target |
|---|---|---|
| Authentication & Security | PostgreSQL integration, lockout, session/device validation, authorization tests | PASS |
| Database Integrity | Clean migrations, schema assertions, invariant tests, migration re-apply | PASS |
| Sales Integrity | PostgreSQL checkout integration and rollback/idempotency coverage | PASS |
| Inventory Integrity | DB-enforced ledger invariants plus sale/refund/void integration coverage | PASS |
| Payments | Provider integration, durable provider reference/state, reconciliation and failure tests | PASS |
| Refund / Void | Compensating ledger, DB constraints, idempotency, inventory/cash compensation, provider settlement where applicable | PASS |
| Shift / Cash | Open/close lifecycle, balance invariants, authorization, concurrent mutation and reconciliation tests | PASS |
| Offline Queue / Sync | Durable outbox, server endpoint, retry/backoff, idempotent replay, conflict handling, authoritative confirmation | PASS |
| Idempotency | Store-scoped unique keys, cached replay, conflict detection, transaction-level concurrency tests | PASS |
| Audit | Append-only/immutable enforcement, actor/store/request correlation, critical-event coverage | PASS |
| Observability | Structured logs, metrics, traces/request IDs, health/readiness, actionable alerts | PASS |
| Backup / Restore | Automated backup policy plus successful restore verification against a disposable database | PASS |
| Disaster Recovery | Documented RPO/RTO, recovery procedure, restore drill evidence and dependency inventory | PASS |
| Production Infrastructure | Server entrypoint, deployment config, secrets, resource limits, health/readiness, migrations and rollback strategy | PASS |
| CI/CD | Required checks enforced on main, dependency/security checks, integration gates, migration gate, safe deployment/rollback | PASS |
| Security Hardening | Secure headers/config, secret handling, dependency scanning, least privilege, rate limiting and production config review | PASS |

## Current known blockers

1. Main branch ruleset enforcement must be enabled; a configured-but-disabled ruleset is not a merge gate.
2. Card and QR refunds require evidence of external payment-provider settlement, durable provider references/state, and idempotent retry/reconciliation behavior where those methods represent real external funds.
3. Offline synchronization needs server-side integration evidence; a client-side outbox type alone is insufficient.
4. Audit immutability and complete critical-event coverage need database/production evidence.
5. Backup/restore and disaster-recovery drills need executable evidence, not only documentation.
6. Production runtime/deployment needs a verified server entrypoint and operational configuration.

## Rule

Never close a critical gate solely because a test was added. The test must execute in CI or against a real integration environment and demonstrate the invariant it claims to protect.
