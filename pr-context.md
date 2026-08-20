# PR Context — fix/ai-review-timeouts-and-errors

## Problem
"Review by Mira" (simple review) works locally but fails on prod (wiki-qa.agircollectif.org, Supabase project `enxddisazdljwcvranya`).

## Root cause (confirmed via prod logs)
- Prod `ai-review` POST → HTTP `546 WORKER_RESOURCE_LIMIT` after ~150s (`WallClockTime` shutdown, cpu=136ms).
- The function was blocked on outbound HTTP calls with **no timeout**:
  - LLM provider `fetch` calls (`openai-compatible.ts`, `anthropic.ts`, `gemini.ts`) — no `AbortSignal`.
  - MediaWiki axios instance (`mediawikiApiInstances.ts`) — no default `timeout`.
- Deployed code was byte-identical to local (v168) — not a code divergence; the 150s hard wall-clock limit only exists in the hosted edge runtime, not local Deno. Locally the LLM call returns fast, so the review completes; in prod the free model (`openrouter/free` alias) is slow/rate-limited and the call hangs until the 150s kill.

## Changes
1. **Timeouts (30s)** on all three LLM provider fetches + MediaWiki axios instance — a hung call now fails fast with a clear error instead of burning the full 150s.
2. **Meaningful errors**:
   - Backend (`ai-review/index.ts`): error response now includes `model` + `details`.
   - Frontend (`useMiraReviewStore.ts`): error notification persists until dismissed (`timeout: 0`, was 5s) and shows model/timeout-aware messages.

## Verification
- `deno check` on changed files — pass.
- `deno test supabase/functions --allow-all --node-modules-dir=auto` — 107 passed.
- `pnpm run lint` (frontend) — 0 errors (known v-html warnings).
- `pnpm run prettier:fix` — clean.

## Caveats / follow-ups
- **Not yet deployed to prod** — the fix only takes effect after deploying `ai-review` + frontend to WikiAdviser-QA.
- Model: prod mira bot uses global key + `AI_MODEL` env (default `openrouter/free` alias). Free models are rate-limited/slow; a paid model with a personal key is more reliable. Verified free options: `openai/gpt-oss-20b:free`, `z-ai/glm-5.2:free`, `google/gemma-4-31b-it:free`.
- `deno.lock` was reverted (unrelated CLI version bump from local deno runs) — not part of this PR.