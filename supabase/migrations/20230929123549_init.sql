create table "public"."articles" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "title" text,
    "description" text,
    "current_html_content" text
);


create table "public"."changes" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "status" smallint,
    "type_of_edit" smallint,
    "description" text,
    "article_id" uuid,
    "contributor_id" uuid,
    "content" text not null,
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
    "user_id" uuid,
    "article_id" uuid,
    "role" smallint
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

create or replace view "public"."users" as  SELECT users.instance_id,
    users.id,
    users.aud,
    users.role,
    users.email,
    users.encrypted_password,
    users.email_confirmed_at,
    users.invited_at,
    users.confirmation_token,
    users.confirmation_sent_at,
    users.recovery_token,
    users.recovery_sent_at,
    users.email_change_token_new,
    users.email_change,
    users.email_change_sent_at,
    users.last_sign_in_at,
    users.raw_app_meta_data,
    users.raw_user_meta_data,
    users.is_super_admin,
    users.created_at,
    users.updated_at,
    users.phone,
    users.phone_confirmed_at,
    users.phone_change,
    users.phone_change_token,
    users.phone_change_sent_at,
    users.confirmed_at,
    users.email_change_token_current,
    users.email_change_confirm_status,
    users.banned_until,
    users.reauthentication_token,
    users.reauthentication_sent_at,
    users.is_sso_user,
    users.deleted_at
   FROM auth.users;



