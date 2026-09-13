---
name: prodx-testing-ci
description: High-assurance integration testing and CI/CD gate design for PRODX-POS.
---

# Testing + CI/CD

Tests are evidence, not decoration. Preserve failure visibility.

## Test pyramid for POS
- Unit: deterministic domain calculations and pure rules.
- Integration: real PostgreSQL, transactions, constraints, authorization, idempotency, and persistence behavior.
- End-to-end: critical user/business journeys.
- Security: unauthorized and cross-store access attempts.
- Resilience: retries, crashes, network failure, duplicate delivery, and recovery.

## CI gates
Critical checks must fail closed. Do not use `continue-on-error`, skip conditions, test deletion, snapshot weakening, or environment substitutions to hide failures. Pin important toolchain/dependency inputs where practical.

## Database tests
Critical invariants must execute against PostgreSQL, not only mocks or in-memory substitutes. Include migration-from-clean and migration-from-existing-data coverage when schema changes are safety-sensitive.

## Release evidence
Record commit SHA, workflow/run, test command, environment, database version, migration state, and result. A local green test is not proof of CI green.

## Regression discipline
When a test fails, reproduce it, identify root cause, fix production code/schema/configuration, then retain or strengthen the regression test. Never modify a test solely to make an incorrect implementation pass.
