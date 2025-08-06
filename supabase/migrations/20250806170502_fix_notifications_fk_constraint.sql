-- First, drop the existing foreign key constraint
ALTER TABLE notifications
DROP CONSTRAINT notifications_article_id_fkey;

-- Then, re-add the foreign key with ON DELETE CASCADE
ALTER TABLE notifications
ADD CONSTRAINT notifications_article_id_fkey
FOREIGN KEY (article_id)
REFERENCES articles(id)
ON DELETE CASCADE;
