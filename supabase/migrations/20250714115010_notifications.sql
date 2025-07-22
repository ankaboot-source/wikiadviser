-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row-Level Security (RLS) for relevant tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Allow authenticated users to read own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow notify function to insert notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

-- RLS Policies for notifications (for notify function access)
CREATE POLICY "Allow authenticated users to update own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add foreign key to comments for data integrity
ALTER TABLE public.comments
ADD CONSTRAINT fk_comments_change_id
FOREIGN KEY (change_id) REFERENCES public.changes (id)
ON DELETE CASCADE;

-- Enable real-time for notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.handle_notification_change()
RETURNS TRIGGER AS $$
DECLARE
  article_record RECORD;
  user_profile RECORD;
  change_record RECORD;
BEGIN

  -- New revision (change) inserted - notify only owners/editors, NOT the contributor
  IF TG_TABLE_NAME = 'changes' AND TG_OP = 'INSERT' THEN
    SELECT title INTO article_record FROM public.articles WHERE id = NEW.article_id;
    IF article_record.title IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, message)
      SELECT p.user_id,
             'A new revision to "' || article_record.title || '" has been made.'
      FROM public.permissions p
      WHERE p.article_id = NEW.article_id
        AND p.role IN ('owner', 'editor')
        AND p.user_id != NEW.contributor_id; -- Exclude the person who made the revision
    END IF;

  -- Permissions inserted or updated
  ELSIF TG_TABLE_NAME = 'permissions' AND (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    SELECT title INTO article_record FROM public.articles WHERE id = NEW.article_id;
    SELECT email INTO user_profile FROM public.profiles WHERE id = NEW.user_id;

    IF article_record.title IS NOT NULL THEN
      -- Notify the user who received the permission (only for Editor or Reviewer roles)
      IF NEW.role IN ('editor', 'reviewer') THEN
        INSERT INTO public.notifications (user_id, message)
        VALUES (
          NEW.user_id,
          CASE
            WHEN TG_OP = 'INSERT' THEN
              'You have been granted ' || NEW.role || ' permission to "' || article_record.title || '".'
            ELSE
              'Your permission for "' || article_record.title || '" has been changed to ' || NEW.role || '.'
          END
        );
      END IF;

      -- Notify owners and editors about the permission change (but not the user who received it)
      -- Only for Owner and Editor roles
      IF NEW.role IN ('owner', 'editor') THEN
        INSERT INTO public.notifications (user_id, message)
        SELECT p.user_id,
               CASE
                 WHEN TG_OP = 'INSERT' THEN
                   COALESCE(user_profile.email, 'Unknown User') || ' has been granted access to "' || article_record.title || '".'
                 ELSE
                   COALESCE(user_profile.email, 'Unknown User') || '''s permission for "' || article_record.title || '" has been changed to ' || NEW.role || '.'
               END
        FROM public.permissions p
        WHERE p.article_id = NEW.article_id
          AND p.role IN ('owner', 'editor')
          AND p.user_id != NEW.user_id; -- Exclude the user who received the permission
      END IF;
    END IF;

  -- New comment inserted - notify change owner and other commenters, NOT the commenter
  ELSIF TG_TABLE_NAME = 'comments' AND TG_OP = 'INSERT' THEN
    SELECT c.article_id, c.contributor_id, a.title
    INTO change_record
    FROM public.changes c
    JOIN public.articles a ON a.id = c.article_id
    WHERE c.id = NEW.change_id;

    IF change_record.title IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, message)
      SELECT DISTINCT participant_id,
        'A new comment has been made to a change on "' || change_record.title || '".'
      FROM (
        SELECT change_record.contributor_id AS participant_id
        UNION
        SELECT commenter_id AS participant_id FROM public.comments WHERE change_id = NEW.change_id
      ) participants
      WHERE participant_id != NEW.commenter_id; -- Exclude the person who made the comment
    END IF;

  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in handle_notification_change: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update triggers to use changes table instead of revisions
DROP TRIGGER IF EXISTS trg_changes_notify ON public.changes;
CREATE TRIGGER trg_changes_notify
  AFTER INSERT ON public.changes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_notification_change();

DROP TRIGGER IF EXISTS trg_permissions_notify ON public.permissions;
CREATE TRIGGER trg_permissions_notify
  AFTER INSERT OR UPDATE ON public.permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_notification_change();

DROP TRIGGER IF EXISTS trg_comments_notify ON public.comments;
CREATE TRIGGER trg_comments_notify
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_notification_change();