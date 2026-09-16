# PRODX POS Production Runbook

## Deployment gate

Before production deployment, verify:

- `DATABASE_URL` and all production secrets are injected by the deployment platform, never committed.
- Database migrations are applied by a controlled release step and are safe to re-run.
- The application has a verified HTTP server entrypoint that constructs the production dependency graph and listens on the configured port.
- Liveness and readiness checks are available and distinguish process health from database readiness.
- Resource limits, connection-pool sizing, timeouts, graceful shutdown, and log collection are configured.
- Rollback procedure is documented and tested against the deployed artifact and migration compatibility strategy.

## Backup gate

A production backup claim requires all of the following:

1. Automated backup policy with retention.
2. Encrypted backup storage with restricted access.
3. A restore procedure that can recreate a disposable PostgreSQL instance.
4. A successful restore verification recorded in CI or an operational drill.
5. Verification that restored data preserves financial, inventory, audit, and idempotency invariants.

## Disaster recovery gate

Record explicit RPO/RTO targets, database recovery dependencies, secret/config recovery, external payment-provider dependencies, DNS/network dependencies, and a step-by-step recovery procedure. Run a recovery drill and retain evidence of actual recovery time and validation results.

## Offline recovery gate

Offline transactions must remain explicitly non-authoritative until server confirmation. Synchronization must use durable idempotency keys, retry safely after process/network failure, surface conflicts for operator action, and never silently convert an unresolved transaction into a committed transaction.

## Payment recovery gate

External card/QR refunds must persist provider references and settlement state and support safe retry/reconciliation. A local refund adjustment without provider settlement evidence must not be treated as proof that customer funds were returned.

## Operational evidence

For every production gate, retain the exact commit SHA, CI run/job, test name, migration version, and operational drill record used to establish PASS. If evidence is absent, classify the gate as UNVERIFIED.
