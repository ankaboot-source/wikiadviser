-- Self-chaining review state for section-wise fallback.
-- Each chain processes one batch per edge-function invocation, calling itself
-- for the next batch until all sections are done. The last link posts to
-- MediaWiki and sets pending_diff.
--
-- Additive, idempotent.

CREATE TABLE IF NOT EXISTS public.review_chains (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id    uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  -- Random token that authenticates chain-continuation calls (no user JWT needed)
  chain_token   text NOT NULL,
  -- 0-based index of the batch currently being processed
  batch_index   int NOT NULL DEFAULT 0,
  -- Total number of batches (ceil(sections / BATCH_SIZE))
  total_batches int NOT NULL,
  -- Wikitext accumulated from previous batches (starts as original wikitext,
  -- updated after each batch with improvements)
  wikitext      text NOT NULL,
  -- Number of sections improved so far
  improved_count int NOT NULL DEFAULT 0,
  -- Language code (e.g. 'en')
  language      text NOT NULL,
  -- LLM config serialised as JSON (provider, model, apiKey, prompt, endpoint)
  config_json   jsonb NOT NULL,
  -- System prompt for section-wise review
  system_prompt text NOT NULL,
  -- Custom instructions from the user
  custom_instructions text,
  -- Status: 'active', 'completed', 'failed'
  status        text NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for looking up chains by article (only active ones)
CREATE INDEX IF NOT EXISTS review_chains_article_active_idx
  ON public.review_chains (article_id)
  WHERE status = 'active';

-- Index for looking up chains by token (for /chain endpoint)
CREATE INDEX IF NOT EXISTS review_chains_token_idx
  ON public.review_chains (chain_token)
  WHERE status = 'active';