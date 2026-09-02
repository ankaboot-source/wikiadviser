-- Fix typo in the first review_chains migration index (status = 'ative' instead of 'active').

DROP INDEX IF EXISTS review_chains_token_idx;

CREATE INDEX IF NOT EXISTS review_chains_token_idx
  ON public.review_chains (chain_token)
  WHERE status = 'active';