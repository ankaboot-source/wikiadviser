-- Add the new column to the comments table
ALTER TABLE comments
ADD COLUMN article_id uuid NOT NULL;

-- Add a foreign key constraint
ALTER TABLE comments
ADD CONSTRAINT fk_comments_article_id
FOREIGN KEY (article_id)
REFERENCES articles(id) ON DELETE CASCADE;


-- Add realtime for table comments
ALTER publication supabase_realtime ADD TABLE public.comments;
