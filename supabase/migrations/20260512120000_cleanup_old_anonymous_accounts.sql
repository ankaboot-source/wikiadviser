-- Cleanup old anonymous accounts migration

-- Manually insert the service_role_key into vault.secrets before running this migration like so:
-- INSERT INTO vault.secrets (name, secret)
-- VALUES ('service_role_key', 'YOUR_SECRET_VALUE');

-- Add optional_user_id to delete_user_and_anonymize_data
CREATE OR REPLACE FUNCTION public.delete_user_and_anonymize_data(optional_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  anonymous_id uuid;
  target_user_id uuid;
BEGIN

  -- fallback logic
  target_user_id := COALESCE(optional_user_id, auth.uid());

  -- safety check
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No target_user_id provided and no auth.uid() available';
  END IF;

  -- delete articles owned by user
  DELETE FROM articles
  WHERE id IN (
    SELECT article_id
    FROM permissions
    WHERE role = 'owner'
      AND user_id = target_user_id
  );

  -- get anonymous fallback user
  SELECT id INTO anonymous_id
  FROM profiles
  WHERE email = 'deleted-user@wikiadviser.io'
  LIMIT 1;

  -- reassign data
  UPDATE changes
  SET contributor_id = anonymous_id
  WHERE contributor_id = target_user_id;

  UPDATE comments
  SET commenter_id = anonymous_id
  WHERE commenter_id = target_user_id;

  -- cleanup relations
  DELETE FROM permissions
  WHERE user_id = target_user_id;

  DELETE FROM profiles
  WHERE id = target_user_id;

END;
$$;

-- Generic invoke_edge_function to call edge functions from SQL
CREATE OR REPLACE FUNCTION private.invoke_edge_function(
    edge_function_name TEXT,
    body JSONB DEFAULT '{}'::jsonb,
    method TEXT DEFAULT 'POST'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    project_url TEXT;
    service_role_key TEXT;
    response JSONB;
BEGIN
    SELECT decrypted_secret INTO project_url
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_project_url';

    SELECT decrypted_secret INTO service_role_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key';

    IF project_url IS NULL OR service_role_key IS NULL THEN
        RAISE EXCEPTION 'Missing vault secrets: project_url or service_role_key';
    END IF;

    method := UPPER(method);

    IF method = 'DELETE' THEN
		response := net.http_delete(
			url := project_url || '/functions/v1/' || edge_function_name,
			headers := jsonb_build_object(
				'Content-Type', 'application/json',
				'Authorization', 'Bearer ' || service_role_key,
				'x-user-id', body->>'user_id' -- pg_net doesnt currently support body in DELETE requests, so we pass user_id as a header
			)
		);
    ELSE
        response := net.http_post(
            url := project_url || '/functions/v1/' || edge_function_name,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || service_role_key
            ),
            body := body
        );
    END IF;

    RETURN response;
END;
$$;

CREATE OR REPLACE FUNCTION private.cleanup_inactive_anon_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN
        SELECT p.id
        FROM public.profiles p
        JOIN auth.users au ON au.id = p.id
		WHERE au.is_anonymous IS TRUE
		
		AND EXISTS (
            SELECT 1
            FROM public.permissions per
            WHERE per.user_id = p.id
        )
        AND NOT (
            au.created_at >= NOW() - INTERVAL '90 days'
            OR EXISTS (
                SELECT 1
                FROM (
                    SELECT user_id AS id, created_at FROM public.permissions
                    UNION ALL
                    SELECT commenter_id, created_at FROM public.comments
                    UNION ALL
                    SELECT contributor_id, created_at FROM public.changes
                ) activity
                WHERE activity.id = p.id
                  AND activity.created_at >= NOW() - INTERVAL '90 days'
            )
        )
    LOOP
        -- 1. Edge function cleanup
        PERFORM private.invoke_edge_function(
            'article',
            jsonb_build_object(
                'user_id', u.id
            ),
            'DELETE'
        );

        -- 2. DB cleanup
        PERFORM public.delete_user_and_anonymize_data(u.id);
    END LOOP;
END;
$$;

SELECT cron.schedule(
    'cleanup-inactive-anon-users-weekly',
    '0 3 * * 0',  -- every Sunday at 03:00
    $$ SELECT private.cleanup_inactive_anon_users(); $$
);
