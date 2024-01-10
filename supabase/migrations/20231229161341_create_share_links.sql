-- create table
create table "public"."share_links" (
  "id" uuid not null default gen_random_uuid(),
  "expired_at" timestamp with time zone,
  "article_id" uuid not null
);

CREATE UNIQUE INDEX share_links_pkey ON public.share_links USING btree (id);
alter table "public"."share_links"
add constraint "share_links_pkey" PRIMARY KEY using index "share_links_pkey";
alter table "public"."share_links"
add constraint "share_links_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE not valid;
alter table "public"."share_links" validate constraint "share_links_article_id_fkey";

-- add trigger to table
CREATE FUNCTION delete_old_share_links() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM "public"."share_links"
  WHERE expired_at < NOW();

  RETURN NEW;
END;
$$;

CREATE TRIGGER delete_old_share_links_trigger
AFTER INSERT
ON "public"."share_links" EXECUTE PROCEDURE delete_old_share_links();

-- add viewer function
CREATE OR REPLACE FUNCTION add_viewer_to_article(user_id uuid, token uuid) RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE share_record share_links %ROWTYPE;
BEGIN
  SELECT * INTO share_record
  FROM share_links
  WHERE id = token
  AND expired_at >= NOW()
  LIMIT 1;

  INSERT INTO permissions(user_id, article_id, role)
  VALUES (
    user_id,
    share_record.article_id,
    'viewer'
  );

  RETURN share_record.article_id;
END;
$$;

-- drop policy
DROP FUNCTION IF EXISTS insert_permissions_policy();
