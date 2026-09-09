# ADR-001 — Database & Backend Foundation Decision Gate

- **Status:** Proposed
- **Date:** 2026-09-09
- **Scope:** Production backend and persistence foundation for PRODX POS
- **Gate:** Database Decision Gate (must be accepted before persistence implementation)

## Context

The current PRODX-POS repository is a React/Vite application with a framework-neutral server-side AI boundary. The AI HTTP contract explicitly requires a future production backend to authenticate the transport, derive identity from verified backend authentication context, and never trust browser-supplied identity or permissions.

The repository does not currently contain a verified PostgreSQL persistence layer or a production HTTP backend that can serve as the authoritative system boundary. Implementing database repositories before this decision is accepted would risk coupling domain code to an unapproved persistence design and would weaken the project's architecture gates.

## Decision

The production foundation is defined as follows, subject to acceptance of this ADR:

1. **Authoritative backend:** Node.js + TypeScript backend, using NestJS or an equivalent modular HTTP framework that preserves strict domain/application/infrastructure boundaries.
2. **Primary database:** PostgreSQL for authoritative transactional state.
3. **Money:** PostgreSQL `NUMERIC(12,2)` (or stricter precision where a domain calculation requires it); JavaScript floating-point values must not represent authoritative monetary amounts.
4. **Time:** store authoritative timestamps in UTC; business operations use an explicit store/business timezone.
5. **Tenant isolation:** every tenant-owned query and write is scoped by organization and store where applicable; isolation is enforced in the application boundary and reinforced by database constraints/queries.
6. **Transactions:** sales, payments, inventory movements, cash operations, voids, refunds, and related financial state changes are atomic database transactions.
7. **Concurrency:** authoritative inventory/cash/numbering operations must use explicit transactional locking/concurrency controls where required; correctness must not depend on client ordering.
8. **Idempotency:** externally retried write operations use a durable idempotency key with database-enforced uniqueness at the correct tenant/scope boundary.
9. **Migrations:** schema changes are versioned, forward-applied, reviewable, and safe to validate in CI; migration state must have one authoritative head.
10. **Server authority:** the browser is never authoritative for identity, authorization, money, inventory, document numbering, or final transaction state.
11. **AI integration:** the existing AI boundary remains behind the authenticated backend; AI capability authorization occurs before provider execution and provider credentials remain server-side.
12. **Offline:** offline writes are treated as durable client outbox candidates and are reconciled through an idempotent server-owned sync protocol; offline state never overrides authoritative server state.

## Explicit non-decisions

This ADR does **not** approve implementation of:

- concrete PostgreSQL tables or migrations;
- authentication/session/token storage;
- RBAC persistence;
- sales, payment, inventory, cash, refund, or shift repositories;
- Redis topology or queue semantics;
- deployment infrastructure;
- hardware-agent integration.

Those capabilities require their own implementation gates and acceptance criteria.

## Required implementation gates after acceptance

### Gate A — Backend boundary

Must establish the authenticated HTTP boundary, request context, error contract, validation, authorization hook, and dependency direction before domain persistence is wired.

### Gate B — Database foundation

Must establish PostgreSQL connectivity, migration tooling, transaction boundary, schema conventions, UTC timestamp policy, monetary types, tenant keys, and integration-test infrastructure.

### Gate C — Domain persistence

Only after A and B pass may repositories and transactional use cases for catalog, inventory, sales, payments, shifts, voids, and refunds be implemented capability-by-capability.

## Acceptance criteria

This decision gate is accepted only when reviewers agree that:

- the backend is the sole authoritative API boundary;
- PostgreSQL is the authoritative transactional store;
- domain code remains vendor-independent;
- persistence is isolated behind application interfaces;
- tenant isolation is explicit and testable;
- monetary precision and UTC/business-time rules are explicit;
- idempotency and concurrency are first-class invariants;
- migrations and integration tests are mandatory CI gates;
- no provider secret, browser identity, or client-calculated financial result becomes authoritative;
- the next implementation milestone is allowed only after this ADR is accepted.

## Rejection / rollback condition

If implementation begins before this ADR is accepted, the database/backend work must be stopped and returned to the decision gate. Passing frontend or AI checks does not authorize persistence implementation.

## Evidence from current repository

The repository's current package scripts provide frontend typecheck/build plus server typecheck/test commands, while the existing AI integration documentation explicitly describes the repository as a React/Vite application and says the production API route must attach to an authenticated backend boundary. These facts are the basis for this gate.
