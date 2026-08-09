# PR Context — Implement code-review-graph

## What

- **`.github/workflows/code-review-graph.yml`** — runs on every PR: the `code-review-graph` action ([tirth8205/code-review-graph](https://github.com/tirth8205/code-review-graph)@v2.3.6) builds a Tree-sitter structural graph on the runner and posts a comment-only review with the minimal context (callers/dependents/tests affected by the change). Local-first (no source sent externally). No merge gate (merges are human-only in this repo).
- **AGENTS.md** — added an "AI-assisted review (code-review-graph)" note documenting the action + the local OpenCode MCP option (`pip install code-review-graph && code-review-graph install` then `code-review-graph build`).

## Notes

- Workflow + docs only (no DB paths) → the DB change guard passes.
- Third-party action pinned to a semantic version tag `v2.3.6` (not `@latest`); SHA-pinning is an option if supply-chain policy requires it.
- This PR itself will get a code-review-graph review once merged to main (the action runs on PRs from main's workflow file).
- `docs/agentic-dev.md` (in the pending #1452) will be the home for more detail once it merges.