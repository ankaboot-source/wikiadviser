CREATE EXTENSION IF NOT EXISTS pg_net;
DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('comment', 'revision', 'role')),
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    article_id UUID NOT NULL REFERENCES public.articles(id),
    triggered_by UUID NOT NULL REFERENCES public.profiles(id),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    params jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read own notifications"
ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update own notifications"
ON public.notifications
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow service insert via Edge Function"
ON public.notifications
FOR INSERT WITH CHECK (true);

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION execute_notification_edge_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    supabase_project_url TEXT;
    payload JSONB;
BEGIN
    SELECT decrypted_secret INTO supabase_project_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_project_url';

    IF supabase_project_url IS NULL THEN
        RAISE EXCEPTION 'Missing Supabase project URL in vault';
    END IF;

    payload := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', to_jsonb(NEW),
        'old_record', to_jsonb(OLD)
    );

    PERFORM net.http_post(
        supabase_project_url || '/functions/v1/notification',
        payload,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-supabase-webhook-source', TG_TABLE_NAME || '_' || lower(TG_OP)
        )
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_changes ON public.changes;
CREATE TRIGGER trg_changes
AFTER INSERT ON public.changes
FOR EACH ROW EXECUTE FUNCTION execute_notification_edge_function();

DROP TRIGGER IF EXISTS trg_comments ON public.comments;
CREATE TRIGGER trg_comments
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION execute_notification_edge_function();

DROP TRIGGER IF EXISTS trg_permissions_insert ON public.permissions;
CREATE TRIGGER trg_permissions_insert
AFTER INSERT ON public.permissions
FOR EACH ROW EXECUTE FUNCTION execute_notification_edge_function();

DROP TRIGGER IF EXISTS trg_permissions_update ON public.permissions;
CREATE TRIGGER trg_permissions_update
AFTER UPDATE ON public.permissions
FOR EACH ROW EXECUTE FUNCTION execute_notification_edge_function();

