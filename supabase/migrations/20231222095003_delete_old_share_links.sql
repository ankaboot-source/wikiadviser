CREATE FUNCTION delete_old_share_links() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  DELETE FROM "public"."share_links" WHERE expired_at < NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER delete_old_share_links_trigger
AFTER INSERT ON "public"."share_links"
EXECUTE PROCEDURE delete_old_share_links();
