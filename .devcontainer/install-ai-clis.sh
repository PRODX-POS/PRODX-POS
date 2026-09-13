#!/usr/bin/env bash
set -euo pipefail

# Keep CLI tooling user-local: no sudo, no credentials, and no secrets committed.
NPM_PREFIX="${HOME}/.npm-global"
npm config set prefix "${NPM_PREFIX}"
mkdir -p "${NPM_PREFIX}/bin"

export PATH="${NPM_PREFIX}/bin:${PATH}"
if ! grep -q 'export PATH="$HOME/.npm-global/bin:$PATH"' "${HOME}/.bashrc" 2>/dev/null; then
  printf '\nexport PATH="$HOME/.npm-global/bin:$PATH"\n' >> "${HOME}/.bashrc"
fi

npm install -g @openai/codex @opencode/cli @anthropic-ai/claude-code

echo "AI CLI toolchain:"
codex --version
opencode --version
claude --version
