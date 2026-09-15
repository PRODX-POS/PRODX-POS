# PRODX-POS AI Review Automation

## Review lane

Repository-owned pull requests use an automated OpenRouter review lane before merge.

- Primary reviewer: `nex-agi/nex-n2.5-pro:free`
- Fallback reviewer: `nex-agi/nex-n2.5-mini:free`
- Emergency availability fallback: `openrouter/free`
- Review output: validated JSON with `PASS`, `WARN`, or `FAIL`
- `PASS`: eligible for automated formal GitHub approval
- `WARN`: no approval; surfaced for follow-up
- `FAIL`: formal change request and merge blocked

## Trust boundaries

The AI reviewer is not authoritative over production correctness. GitHub Actions, PostgreSQL, authentication/security, architecture contracts, branch protection, and required status checks remain independent gates.

External review bots such as Codex/CR-GPT are not required dependencies for the repository-owned OpenRouter gate.

Every review records the requested model and served model so that provider routing and fallback behavior remain auditable.
