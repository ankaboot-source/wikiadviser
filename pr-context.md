# PR Context — Give /oc agent git push auth (GITHUB_TOKEN)

## Problem

On PR #1449, `/oc add screenshots...` → the agent made the changes but `git push` failed:

> fatal: could not read Username for 'https://github.com': No such device or address

Root cause: the workflow's `actions/checkout` uses **`persist-credentials: false`**, so checkout removes the git credentials after checkout ("Removing includeIf entries pointing to credentials config files"). The git-identity fix (#1454) covered `user.name`/`user.email` but not **push auth** — the agent has the GITHUB_TOKEN in env but git has no credentials configured.

## Fix

In the existing "Configure git identity" step, add the GITHUB_TOKEN as git HTTP auth for the workdir (same `x-access-token` basic scheme actions/checkout uses):

```bash
git config --local http.https://github.com/.extraheader "AUTHORIZATION: basic $(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64)"
```

## Note

The first `/oc` in that exchange (12:38) replied with a PR summary instead of executing the screenshot task — a separate model-execution flub, not covered by this fix.

## Verify after merge

Post `/oc <task that changes files>` on a PR → the agent should commit and push successfully (previously failed with "could not read Username").