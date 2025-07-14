CREATE EXTENSION IF NOT EXISTS http;
CREATE OR REPLACE FUNCTION notify_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM http((
    'POST',
    http://host.docker.internal:54321/functions/v1/notify
    -- PROD   ➜  https://<your-ref>.supabase.co/functions/v1/notify
    COALESCE(current_setting('app.notify_url', true), 'http://host.docker.internal:54321/functions/v1/notify'),
    ARRAY[
      http_header('Content-Type','application/json'),
      http_header('Authorization','Bearer '||current_setting('app.settings.supabase_anon_key'))
    ],
    jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW),
      'old_record', NULL
    )::text
  ));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_revisions
AFTER INSERT ON public.revisions
FOR EACH ROW EXECUTE FUNCTION notify_trigger();

CREATE TRIGGER trg_article_users
AFTER INSERT ON public.article_users
FOR EACH ROW EXECUTE FUNCTION notify_trigger();

CREATE TRIGGER trg_comments
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION notify_trigger();