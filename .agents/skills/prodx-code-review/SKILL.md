---
name: prodx-code-review
description: Adversarial code-review skill focused on root cause, invariants, attack paths, and production failure modes.
---

# Adversarial Code Review

Review changes as if you are responsible for a financial incident after deployment.

## Review order
1. Identify the business invariant the change must preserve.
2. Identify trust boundaries and authoritative state.
3. Trace happy path and every meaningful failure path.
4. Check concurrency, retries, partial failure, and stale data.
5. Check authorization and store isolation on every affected operation.
6. Check database constraints and transaction boundaries.
7. Check tests and CI evidence.

## Severity
- **P0**: can corrupt money, inventory, tenant isolation, authentication, or durable audit truth.
- **P1**: production outage, unsafe migration, data loss, or bypass of a critical gate.
- **P2**: material correctness/security/reliability defect with bounded impact.
- **P3**: maintainability or low-risk issue.

## Review standard
Prefer concrete failure scenarios over stylistic comments. For every finding state impact, exploit/failure path, affected invariant, evidence, and recommended root-cause fix. Do not approve a change because tests are green if the tests do not exercise the relevant invariant.
