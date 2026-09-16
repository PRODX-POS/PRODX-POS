# Production Gate Execution Order

Execute gates in dependency order. Do not skip ahead when a prerequisite is unverified.

1. Architecture and runtime composition
2. Authentication, authorization, device/session security
3. PostgreSQL schema and database-enforced invariants
4. Checkout, payment recording, inventory and cash integrity
5. Refund/void including external payment settlement
6. Idempotency and concurrent/retry behavior
7. Offline outbox/server synchronization and conflict recovery
8. Audit immutability and critical-event coverage
9. Observability, health/readiness and alerting
10. Backup/restore and disaster recovery drills
11. Production infrastructure, deployment and rollback
12. CI/CD branch enforcement and security hardening

For each step, capture reproducible evidence. A downstream gate cannot compensate for a failed or unverified upstream gate.
