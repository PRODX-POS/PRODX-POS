# PRODX AI Control Plane

## Purpose
PRODX uses one server-side AI control plane instead of allowing product features, the browser, or CI jobs to select arbitrary providers/models directly.

```text
Application workload
      |
      v
AI Task Router
  - task/capability
  - risk tier
  - permission
  - vision requirement
      |
      v
AI Model Registry
  - provider
  - model id
  - capability tier
  - quality/context/vision metadata
      |
      v
Existing AI Gateway
  - authenticated org/user/store scope
  - permission authorization
  - request/output budgets
  - prompt-injection boundary
  - secret/PII redaction
  - audit
      |
      v
Provider adapters
  - OKMD
  - OpenAI
  - future providers
```

## Workload classes

### Product
`assistant`, `explanation`, `draft`

### Engineering
`code_generation`, `refactoring`, `debugging`, `test_generation`, `migration_analysis`

### Design
`ux_analysis`, `ui_design`, `css_generation`, `accessibility_review`, `design_system_review`

### Review
`code_review`, `architecture_review`, `security_review`, `database_review`, `production_readiness_review`

### Operations
`sales_insight`, `inventory_insight`, `operational_assistant`, `management_insight`

## Routing policy

The application requests a workload, not a raw model. The router selects an enabled model that satisfies the workload tier and minimum quality score. Vision tasks require `supportsVision=true`. A preferred provider is an optional hard constraint, never a bypass around eligibility policy.

The model catalog is intentionally injected into the registry. Production composition must populate it from an authoritative provider model-discovery/configuration process; do not hard-code guessed provider model names into business features.

## Security boundaries

- The browser must never hold provider API keys.
- Repository/business/customer context is untrusted prompt data.
- AI cannot mutate authoritative POS state directly.
- Financial totals, VAT, inventory, payments, refunds, voids, and audit records remain backend/domain authoritative.
- High and critical workloads require human approval before consequential action.
- AI review workflows are advisory and must not approve or merge pull requests.

## Review lanes

Deterministic gates remain separate and authoritative:

- `production-quality-gate.yml` — typecheck, tests, PostgreSQL, theme validation, build, security scans.
- `ai-code-review.yml` — advisory code/architecture/security review.
- `ai-ui-review.yml` — advisory UI/UX/CSS/accessibility/design-system review.

AI review failure must not be used as a substitute for deterministic production gates. AI findings should improve the change before human approval; they do not establish Production Ready status by themselves.

## UI/UX contract

UI review should consider the implementation plus the PRODX theme tokens and component system. When screenshot/visual input becomes available, the intended review pipeline is:

```text
Screenshot + component tree + CSS + theme tokens + accessibility tree
        -> AI design critic
        -> findings / patch proposal
        -> theme validator
        -> frontend typecheck/build
        -> human review
```

Never upload production/customer screenshots to an external model without an explicit redaction and data-classification policy.
