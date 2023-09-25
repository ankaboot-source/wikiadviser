create table "public"."articles" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "title" text,
    "description" text,
    "base_html_content" text,
    "current_html_content" text
);


create table "public"."changes" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "status" smallint,
    "type_of_edit" smallint,
    "description" text,
    "content" text not null,
    "article_id" uuid,
    "contributor_id" uuid,
    "index" smallint
);


create table "public"."comments" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "content" text,
    "commenter_id" uuid,
    "change_id" uuid
);


create table "public"."permissions" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "role" smallint,
    "user_id" uuid,
    "article_id" uuid
);


CREATE UNIQUE INDEX articles_pkey ON public.articles USING btree (id);

CREATE UNIQUE INDEX changes_pkey ON public.changes USING btree (id);

CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);

CREATE UNIQUE INDEX permissions_pkey ON public.permissions USING btree (id);

alter table "public"."articles" add constraint "articles_pkey" PRIMARY KEY using index "articles_pkey";

alter table "public"."changes" add constraint "changes_pkey" PRIMARY KEY using index "changes_pkey";

alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY using index "comments_pkey";

alter table "public"."permissions" add constraint "permissions_pkey" PRIMARY KEY using index "permissions_pkey";

alter table "public"."changes" add constraint "changes_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE not valid;

alter table "public"."changes" validate constraint "changes_article_id_fkey";

alter table "public"."changes" add constraint "changes_contributor_id_fkey" FOREIGN KEY (contributor_id) REFERENCES auth.users(id) ON DELETE RESTRICT not valid;

alter table "public"."changes" validate constraint "changes_contributor_id_fkey";

alter table "public"."comments" add constraint "comments_change_id_fkey" FOREIGN KEY (change_id) REFERENCES changes(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_change_id_fkey";

alter table "public"."comments" add constraint "comments_commenter_id_fkey" FOREIGN KEY (commenter_id) REFERENCES auth.users(id) ON DELETE RESTRICT not valid;

alter table "public"."comments" validate constraint "comments_commenter_id_fkey";

alter table "public"."permissions" add constraint "permissions_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE not valid;

alter table "public"."permissions" validate constraint "permissions_article_id_fkey";

alter table "public"."permissions" add constraint "permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."permissions" validate constraint "permissions_user_id_fkey";


