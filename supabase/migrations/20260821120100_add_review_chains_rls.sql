-- RLS policies for review_chains (added after the table was created).
-- Additive, idempotent.

ALTER TABLE public.review_chains ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'review_chains' AND policyname = 'review_chains_select'
  ) THEN
    CREATE POLICY review_chains_select ON public.review_chains
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'review_chains' AND policyname = 'review_chains_cancel'
  ) THEN
    CREATE POLICY review_chains_cancel ON public.review_chains
      FOR UPDATE
      TO authenticated
      USING (status = 'active')
      WITH CHECK (status = 'cancelled');
  END IF;
END $$;