-- Add nullable revision_id on comments so a comment can target
-- a whole revision (the MediaWiki revision grouping N changes)
-- in addition to the existing change-level comments.

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS revision_id uuid NULL;

ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS comments_revision_id_fkey;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_revision_id_fkey
    FOREIGN KEY (revision_id)
    REFERENCES public.revisions(id)
    ON DELETE CASCADE;

-- A comment must target either a change or a revision (or both),
-- but never be completely orphan.
ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS comments_target_chk;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_target_chk
    CHECK (change_id IS NOT NULL OR revision_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS comments_revision_id_idx
  ON public.comments (revision_id);
