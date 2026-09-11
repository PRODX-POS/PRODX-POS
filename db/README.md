# PRODX Database Foundation

M0 Gate B establishes PostgreSQL as the authoritative transactional store while keeping domain persistence closed until Gate C.

## Invariants

- PostgreSQL is authoritative for transactional state.
- Authoritative timestamps use UTC (`TIMESTAMPTZ`).
- Business timezone is supplied explicitly by store/application context.
- Monetary persistence must use PostgreSQL `NUMERIC`, never JavaScript floating point.
- Tenant-owned data must carry organization/store scope where applicable.
- Transactional writes must be atomic.
- Retried external writes require durable, scope-aware idempotency keys.
- Inventory, cash, and document numbering require explicit concurrency controls.
- Migration history has one authoritative head.

## Migration policy

Migrations are forward-only, reviewable SQL files under `db/migrations/`. M0 deliberately creates only migration metadata and a migration lock. Business tables are prohibited until Gate C is accepted.

## Validation

CI provisions PostgreSQL 16, applies every migration in lexical order, verifies the migration head is singular, verifies UTC timestamp behavior and numeric precision behavior, and verifies migration idempotency.
