# PRODX-POS OpenRouter AI Code Review

OpenRouter is the active AI code-review provider for pull requests.

- Workflow: `.github/workflows/prodx-openrouter-ai-code-review.yml`
- Secret: `OPENROUTER_API_KEY`
- Optional preferred model variable: `OPENROUTER_AI_REVIEW_MODEL_ID`
- Review result: `PASS`, `WARN`, or `FAIL`
- `CRITICAL` or `HIGH` findings force `FAIL` and fail the workflow.
- Pull-request diffs are sanitized before being sent to the provider.
- Fork pull requests are rejected before any provider secret is used.
- Legacy OKMD review/diagnostic workflows are removed.

This AI review is an engineering evidence gate; it does not replace human approval or the deterministic Security, Database, Transaction, and Production Quality gates.
