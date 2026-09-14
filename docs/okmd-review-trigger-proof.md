# OKMD Review Trigger Proof

This file is part of the verification PR and intentionally creates a new repository-owned `synchronize` event so the trusted `pull_request_target` OKMD review lane can be observed independently of deterministic gates.

Acceptance evidence remains a real OKMD `/models` call, a successful `/chat/completions` call using the selected advertised model, and a provider-backed review comment on the pull request.