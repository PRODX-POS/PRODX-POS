# PRODX Engineering Operating Model

**Status:** Approved by Owner
**Effective:** 2026-09-11
**Project:** PRODX POS

## 1. Ownership and operating model

- The Owner is the product owner and approver.
- The Owner does not perform manual coding, debugging, deployment, or routine engineering operations.
- ChatGPT acts as the engineering manager/orchestrator: translating Owner commands into architecture planning, capability breakdown, implementation coordination, verification, review, gates, and milestone reporting.
- Owner approval is required at meaningful milestone/acceptance gates, not for routine implementation steps.

## 2. AI Automated Developer Engineering

PRODX development is operated as an AI-automated engineering workflow.

The standard flow is:

`Owner Command -> ChatGPT Engineering Management -> Architecture/Task Planning -> AI Implementation/Analysis -> Automated Tests/Gates -> Security & Architecture Review -> Independent Review -> Milestone Acceptance -> Merge -> Main Verification`

Manual coding by the Owner is not a required project workflow.

## 3. AI provider redundancy

AI provider availability must not become a single point of failure for engineering execution.

- Use the best available AI engineering capability for each task.
- When a provider or capability is unavailable, blocked, or degraded, route suitable work to an available fallback provider/capability.
- Independent work may continue in parallel while a blocked task is being resolved.
- Provider fallback must never weaken security, architecture, database, testing, or acceptance gates.
- A failed gate blocks the affected change until corrected; it does not require unrelated engineering work to stop.
- No provider is treated as authoritative for production correctness merely because it produced an implementation.

## 4. Production quality policy

PRODX remains a real production product. The following are mandatory:

- Production-grade architecture
- Security by Default
- Financial Integrity
- Inventory Integrity
- Multi-Tenant Data Isolation
- Idempotency
- Auditability
- Offline Resilience
- Server Authority
- Automated Quality and Architecture Gates
- GPT Technical Review
- Independent Review
- Milestone Acceptance Gate before Merge
- Main Verification after Merge

No fallback workflow may skip or weaken these requirements.

## 5. Deployment architecture direction

PRODX is an **Enterprise-grade Hybrid SaaS Platform**:

`One Core - Cloud - Local/On-Premise - Hybrid`

The same PRODX Core must support:

- Cloud SaaS
- Local/On-Premise deployment
- Hybrid deployment: Cloud HQ plus local store nodes with offline capability and synchronization

Deployment concerns must remain outside domain/business logic. The product should provide a customer-oriented deployment path close to:

`Install -> Setup -> Check -> Ready -> Use`

Complexity should be handled by PRODX engineering rather than pushed onto customers.

Hardware support should use a certified compatibility model rather than an unconditional claim of arbitrary hardware support.

## 6. Current implementation sequence

The approved sequence is capability/milestone based:

1. M0 — Enterprise Architecture & Backend Foundation
2. M1 — Identity / Authentication / RBAC
3. M2 — Organization / Store
4. M3 — Catalog
5. M4 — Inventory
6. M5 — Sales
7. M6 — Payment / Shift / Cash
8. M7 — Void / Refund
9. M8 — Audit / Observability
10. M9 — Offline / Sync
11. M10 — Hardware Agent
12. M11 — Local Deployment
13. M12 — Hybrid Deployment
14. M13 — Enterprise Hardening
15. M14 — Production Release

Each milestone must pass its required implementation, automated testing, architecture, security, technical review, independent review, acceptance, merge, and main-verification gates before being considered complete.

## 7. M0 authority boundary

M0 must establish and verify the authoritative backend and database foundation before domain persistence expands.

The current approved architectural direction is:

- Node.js + TypeScript backend using NestJS or an equivalent modular HTTP framework.
- PostgreSQL as authoritative transactional state.
- PostgreSQL NUMERIC (12,2) or stricter for authoritative monetary values where appropriate.
- UTC authoritative timestamps with explicit store/business timezone handling.
- Explicit organization/store tenant isolation.
- Atomic transactions for financial and inventory state changes.
- Explicit concurrency controls where correctness requires them.
- Durable, correctly scoped idempotency keys.
- Versioned migrations with one authoritative migration head.
- Browser/client state is never authoritative for identity, authorization, money, inventory, numbering, or final transaction state.
- AI remains behind an authenticated backend boundary with server-side provider credentials.
- Offline writes use a durable client outbox and idempotent server-owned synchronization.

M0 must not be bypassed by implementing production domain repositories ahead of the required backend/database gates.

## 8. Owner command interpretation

The commands `ลุย`, `ทำต่อ`, `จัดการ`, or equivalent approval commands mean that ChatGPT should proceed with the next safe engineering work under this operating model, without asking the Owner to perform implementation tasks.

If a task is blocked, ChatGPT should identify the blocker, use an approved fallback/parallel path where possible, preserve all quality gates, and report the actual state to the Owner.
