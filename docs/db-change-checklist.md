# DB Change Checklist

Use this for **every** change that touches the data model (schema, migrations,
`database.types.ts`, queries, RLS, seed data). Fill it in and reference it in the
PR body. See the "DB change safety (agentic AI)" section in `AGENTS.md`.

## 1. Classify risk

- [ ] **Low (additive)** — new nullable column, new table, new index, new view.
- [ ] **High (breaking)** — drop/rename column, type change, `NOT NULL`, RLS
      change, data backfill, dropping/recreating objects existing code depends on.

Risk level: `LOW` / `HIGH`

## 2. Human approval gate

- [ ] Explicit human approval obtained **before** writing the migration
      (mandatory for HIGH risk).
- [ ] Migration will **not** be applied to prod/staging by the agent unsupervised.
- [ ] The agent will **not merge** this PR itself — a human reviews and merges it.
- [ ] `db-approved` label added by a human after review (required to pass the
      automated **DB change guard** check, `.github/workflows/db-change-guard.yml`).

## 3. Write safely

- [ ] Append-only, timestamp-prefixed migration (`YYYYMMDDHHMMSS_name.sql`).
- [ ] Idempotent where possible (`IF NOT EXISTS`, `CREATE OR REPLACE`).
- [ ] Prefer additive over destructive.
- [ ] New browser-reachable tables/columns have explicit RLS policies.
- [ ] `database.types.ts` regenerated (not hand-edited).

## 4. Validate (evidence)

- [ ] Applied to a **local/staging DB**; schema + queries verified.
- [ ] Edge-function tests pass (`deno test supabase/functions --allow-all --node-modules-dir=auto`).
- [ ] End-to-end against a **real DB** (not just mock).
- [ ] Post-apply verification queries run (see below).

Post-apply verification queries (paste results):

```
-- e.g. column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'last_seen';

-- e.g. view exposes the new field
SELECT last_seen FROM profiles_view LIMIT 1;
```

## 5. Rollback plan

- [ ] Reverse SQL documented (paste below).
- [ ] Pre-change backup / PITR taken before prod apply.

Reverse SQL:

```sql
-- e.g.
ALTER TABLE profiles DROP COLUMN IF EXISTS last_seen;
-- restore profiles_view from git history
```

## 6. Human review + supervised apply

- [ ] Migration flagged in the PR body (what it does, risk, rollback).
- [ ] A human applies to prod (or supervises) with backup + rollback ready.
