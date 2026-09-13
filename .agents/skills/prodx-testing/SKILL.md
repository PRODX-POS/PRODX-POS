# PRODX Testing

## Mission
Turn production requirements into executable evidence without weakening tests.

## Rules
- Choose test level by failure mode: unit for pure logic, integration for persistence/transactions, E2E for critical user journeys, and failure/concurrency tests for resilience.
- Prefer the real PostgreSQL engine for database integrity tests.
- Test negative paths, authorization failures, duplicate requests, retries, timeouts, partial commits, and concurrent operations.
- Keep tests deterministic and isolated; do not hide failures with broad skips, retries, or weakened assertions.
- Treat a green unit suite as insufficient evidence for cross-component integrity.

## Gate checklist
- [ ] Critical financial journeys covered.
- [ ] Inventory concurrency covered.
- [ ] Auth/store-isolation negative tests covered.
- [ ] Idempotency/retry tests covered.
- [ ] Migration/database integration tests covered.
- [ ] CI executes the required suites.

## Evidence
Record exact test commands, paths, and CI run results. If a required suite is not executed, classify the gate as `Unverified`.
