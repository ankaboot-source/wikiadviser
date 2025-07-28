ALTER TABLE public.comments
DROP CONSTRAINT IF EXISTS fk_comments_change_id;
DROP TRIGGER IF EXISTS trg_comments_notify ON public.comments;
DROP TRIGGER IF EXISTS trg_permissions_notify ON public.permissions;
DROP TRIGGER IF EXISTS trg_changes_notify ON public.changes;
DROP FUNCTION IF EXISTS public.handle_notification_change() CASCADE;

CREATE OR REPLACE FUNCTION execute_edge_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    supabase_project_url TEXT;
    payload JSONB;
BEGIN
    -- Fetch the base URL from Vault
    SELECT decrypted_secret INTO supabase_project_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_project_url';

    -- Validate secrets
    IF supabase_project_url IS NULL THEN
        RAISE EXCEPTION 'Required secrets (URL or service role) are missing';
    END IF;

    -- Build the payload
    payload := jsonb_build_object(
        'type', TG_OP,
        'table', TG_TABLE_NAME,
        'schema', TG_TABLE_SCHEMA,
        'record', to_jsonb(NEW),
        'old_record', to_jsonb(OLD)
    );

    -- Perform HTTP POST to Edge Function
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
-- Trigger for INSERT on changes
CREATE TRIGGER trg_changes
AFTER INSERT ON public.changes
FOR EACH ROW
EXECUTE FUNCTION execute_edge_function();

-- Trigger for INSERT on comments
CREATE TRIGGER trg_comments
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION execute_edge_function();

-- Trigger for UPDATE on notifications
CREATE TRIGGER trg_notifications_update
AFTER UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION execute_edge_function();

-- Trigger for INSERT on permissions
CREATE TRIGGER trg_permissions_insert
AFTER INSERT ON public.permissions
FOR EACH ROW
EXECUTE FUNCTION execute_edge_function();

-- Trigger for UPDATE on permissions
CREATE TRIGGER trg_permissions_update
AFTER UPDATE ON public.permissions
FOR EACH ROW
EXECUTE FUNCTION execute_edge_function();



