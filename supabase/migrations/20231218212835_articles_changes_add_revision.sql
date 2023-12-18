ALTER TABLE changes
  ADD COLUMN revision_id uuid null,
  ADD constraint changes_revision_id_fkey foreign key (revision_id) references revisions (id) on delete cascade;
