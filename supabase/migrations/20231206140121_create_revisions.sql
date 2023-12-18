create table
  public.revisions (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    article_id uuid null,
    summary text null,
    revid bigint not null,
    constraint revisions_pkey primary key (id),
    constraint revisions_article_id_fkey foreign key (article_id) references articles (id) on delete cascade
  ) tablespace pg_default;