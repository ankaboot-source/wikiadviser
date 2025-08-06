ALTER TABLE notifications
DROP CONSTRAINT notifications_article_id_fkey;

ALTER TABLE notifications
ADD CONSTRAINT notifications_article_id_fkey
FOREIGN KEY (article_id)
REFERENCES articles(id)
ON DELETE CASCADE;
