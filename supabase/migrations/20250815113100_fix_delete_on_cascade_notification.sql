ALTER TABLE notifications
DROP CONSTRAINT notifications_triggered_by_fkey;

ALTER TABLE notifications
ADD CONSTRAINT notifications_triggered_by_fkey
FOREIGN KEY (triggered_by)
REFERENCES profiles(id)
ON DELETE CASCADE;

ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_triggered_on_fkey;

ALTER TABLE notifications
ADD CONSTRAINT notifications_triggered_on_fkey
FOREIGN KEY (triggered_on)
REFERENCES profiles(id)
ON DELETE CASCADE;