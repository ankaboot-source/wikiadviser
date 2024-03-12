-- add viewer function
CREATE OR REPLACE FUNCTION is_article_in_exists(article_id uuid) RETURNS uuid
LANGUAGE plpgsql
security definer set search_path = public AS $$
DECLARE
  article_record articles %ROWTYPE;
BEGIN
  SELECT id INTO article_record
  FROM articles
  WHERE id = article_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Article not found';
  END IF;

  RETURN article_record.article_id;
END;
$$;
