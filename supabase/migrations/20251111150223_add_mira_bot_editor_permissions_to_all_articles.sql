DO $$
DECLARE
  bot_user_id uuid;
  article_record RECORD;
BEGIN
  SELECT id INTO bot_user_id
  FROM public.profiles
  WHERE email = 'mira@wikiadviser.io'
  LIMIT 1;

  IF bot_user_id IS NULL THEN
    RETURN;
  END IF;

  FOR article_record IN
    SELECT id FROM public.articles
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.permissions
      WHERE article_id = article_record.id
      AND user_id = bot_user_id
    ) THEN
      INSERT INTO public.permissions (user_id, article_id, role)
      VALUES (bot_user_id, article_record.id, 'editor');
    END IF;
  END LOOP;
END $$;
