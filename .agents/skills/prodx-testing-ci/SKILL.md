---
name: prodx-testing-ci
description: High-assurance testing and CI/CD gate for PRODX-POS. Tests are evidence, not decoration.
---

# PRODX Testing & CI Auditor

Treat CI as a production safety gate that must fail closed.

## Required checks
- Frontend and backend type checking
- Unit tests for critical invariants
- Real PostgreSQL integration tests where database behavior matters
- Migration execution on a clean database and safe rerun verification
- Negative authorization, tenant isolation, and invalid-input tests
- Concurrency, retry, idempotency, crash, and partial-failure tests for critical flows
- Production build validation
- Security/static checks and forbidden-demo-credential scans where applicable
- No skipped/disabled/continue-on-error critical gates

## Evidence standard
Distinguish workflow configuration from an actually executed successful run. A green test suite is only meaningful when the relevant invariant is exercised. Never weaken tests or gates to obtain green CI.

## Release decision
Any failed or unverified critical gate blocks production release until the root cause is fixed and the evidence is rerun.
