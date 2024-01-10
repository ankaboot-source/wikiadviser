-- Add RLS for table revisions
ALTER TABLE public.revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;