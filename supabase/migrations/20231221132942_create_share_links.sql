create table "public"."share_links" (
  "id" uuid not null default gen_random_uuid(),
  "expired_at" timestamp with time zone,
  "article_id" uuid not null
);

CREATE UNIQUE INDEX share_links_pkey ON public.share_links USING btree (id);
alter table "public"."share_links" add constraint "share_links_pkey" PRIMARY KEY using index "share_links_pkey";
alter table "public"."share_links" add constraint "share_links_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE not valid;
alter table "public"."share_links" validate constraint "share_links_article_id_fkey";
