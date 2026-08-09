# PR Context — Fix /oc git push auth header (strip base64 newline)

## Problem

#1455 configured the GITHUB_TOKEN as git HTTP auth, but `base64` emits a trailing newline, producing a malformed `AUTHORIZATION: basic …\n` header. The opencode action's branch fetch then failed:

> Command failed with code 128: git fetch origin --depth=20 guard/db-change-approval
> fatal: unable to access 'https://github.com/…': Failed sending HTTP request

The "Configure git identity" step passed, but the fetch with the bad header failed.

## Fix

Strip the newline from the base64 value:
`base64 | tr -d '\n'`

Verified: header value is 28 bytes (no trailing NL) vs 29 (with NL).

## Verify after merge

Post `/oc <task>` on the PR — the agent should now fetch the branch, run, commit, and push successfully.