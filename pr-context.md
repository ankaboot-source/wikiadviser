# pr-context.md — PR for Dependabot automation

**Branch:** `feat/dependabot-automation-1427`
**Title:** feat(dependabot): group updates, auto-close vendored deps, auto-merge minor/patch, weekly report
**Latest commit:** `cc5dcdcd`

## Changes

- `.github/dependabot.yml` — Group all minor+patch updates per ecosystem (`npm` root + `npm` frontend) into single PRs; cap `open-pull-requests-limit` at 5.
- `.github/workflows/auto-merge-dependabot.yml` — Auto-merge (`--squash`) Dependabot minor/patch PRs on green CI. Skips `semver:major` and any PR touching the vendored `MyVisualEditor` tree.
- `.github/workflows/close-vendored-deps.yml` — Auto-closes Dependabot PRs touching `docker/resources/extensions/MyVisualEditor/**` with an explanatory comment (vendored dead weight — not installed or executed in the built image).
- `.github/workflows/dependabot-weekly-report.yml` — Weekly Monday (09:09 UTC) report issue of open Dependabot PRs with age/type/CI status; also `workflow_dispatch`-able.

## Key decisions

- Grouping uses a single `minor-patch` group with `update-types: [minor, patch]` and pattern `*` per ecosystem, matching standard GitHub grouping guidance.
- `pull_request_target` used for the close/auto-merge workflows so they run with the required write permissions on the target branch; both gate strictly on `github.actor == 'dependabot[bot]'`.
- `auto-merge-dependabot` re-checks vendored paths as a defense-in-depth guard even though `close-vendored-deps` handles them, so a vendored PR can never slip through auto-merge.
- Vendored deps are intentionally closed rather than updated: the `MyVisualEditor` tree is copied verbatim into the MediaWiki container and never npm/composer-installed.
- Weekly report creates an issue rather than a comment so it has a stable, findable home; uses `issues: write` only.

## Open questions

None.

## /oc exchanges

None yet.
