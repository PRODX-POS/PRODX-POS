# PRODX CI/CD

## Mission
Keep delivery pipelines enforcing production quality instead of bypassing it.

## Rules
- Inspect actual workflows, triggers, permissions, environments, and required checks.
- Required architecture, security, database, and integration tests must remain blocking gates where intended.
- Validate dependencies, build artifacts, migrations, and supply-chain/security checks.
- Do not add blanket `continue-on-error`, skip critical jobs, weaken assertions, or bypass checks to obtain green CI.
- Separate build/test artifacts from deployable production artifacts and preserve traceability.
- Ensure rollback/deployment failure behavior is explicit.

## Gate checklist
- [ ] Critical CI checks are present and blocking as designed.
- [ ] Security/dependency checks execute.
- [ ] Database migrations are validated.
- [ ] Integration tests execute in CI.
- [ ] Artifact provenance/traceability is sufficient.
- [ ] Deployment and rollback behavior is verified.

## Evidence
Use actual workflow files, workflow runs, job logs, and statuses. Configuration without a successful run is `Unverified`.
