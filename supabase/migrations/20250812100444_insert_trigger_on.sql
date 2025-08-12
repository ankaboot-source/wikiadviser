CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- recipient
    type TEXT NOT NULL CHECK (type IN ('comment', 'revision', 'role')),
    action TEXT NOT NULL, 
    article_id UUID NOT NULL REFERENCES public.articles(id),
    triggered_by UUID NOT NULL REFERENCES public.profiles(id), -- actor
    triggered_on UUID NOT NULL REFERENCES public.profiles(id), -- affected user
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated users to read own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow service insert via Edge Function"
ON public.notifications
FOR INSERT
WITH CHECK (true);

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
