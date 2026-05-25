#!/usr/bin/env bash
set -e

HOOKS_DIR="$(cd "$(dirname "$0")" && pwd)"
GIT_HOOKS_DIR="$(git rev-parse --show-toplevel)/.git/hooks"

cp "$HOOKS_DIR/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
# cp "$HOOKS_DIR/pre-push" "$GIT_HOOKS_DIR/pre-push"
chmod +x "$GIT_HOOKS_DIR/pre-commit" "$GIT_HOOKS_DIR/pre-push"
# chmod +x "$GIT_HOOKS_DIR/pre-push"

echo "Git hooks installed."
