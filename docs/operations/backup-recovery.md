# PRODX-POS Backup, Restore and Disaster Recovery

## Scope

PostgreSQL is authoritative for sales, payments, inventory, cash, audit and synchronization state. Backups must therefore be produced from PostgreSQL and restore-tested before production sign-off.

## Backup

Run:

```bash
DATABASE_URL='postgresql://...' bash scripts/db-backup.sh ./backups
```

The command creates a PostgreSQL custom-format dump and validates that the archive can be listed by `pg_restore`.

Production policy:

- Store backups outside the application host.
- Encrypt backups at rest and in transit.
- Restrict backup access to authorized operators/service identities.
- Retain multiple recovery points according to the organization's approved retention policy.
- Record backup success/failure and alert on missed backup windows.

## Restore

Restore is destructive and requires an explicit confirmation token:

```bash
CONFIRM_DESTRUCTIVE_RESTORE=YES \
DATABASE_URL='postgresql://...' \
bash scripts/db-restore.sh ./backups/prodx-pos-YYYYMMDDTHHMMSSZ.dump 'postgresql://...'
```

Before a production restore:

1. Freeze application writes.
2. Identify the approved recovery point.
3. Preserve the current database snapshot if the platform supports it.
4. Restore into an isolated target first when practical.
5. Run migration/schema and application integrity checks.
6. Verify organization/store isolation and financial/inventory invariants.
7. Reconcile payments and cash against external records.
8. Record the restore event and operator.
9. Re-enable writes only after validation.

## Disaster recovery exercise

A production readiness sign-off requires an observed restore exercise using a real backup artifact. Record:

- backup timestamp and artifact checksum
- restore start/end timestamps
- observed RTO
- recovery point / observed data loss window
- schema verification result
- sales/payment/inventory/cash reconciliation result
- application smoke-test result
- operator and incident/change reference

The repository provides the backup/restore commands and a CI backup/restore gate, but an actual production restore exercise remains an operational evidence requirement.
