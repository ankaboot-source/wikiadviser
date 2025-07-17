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

-- Trigger definitions (for reference, assuming already set via Supabase webhooks)
CREATE EXTENSION IF NOT EXISTS http;
-- Comments trigger
CREATE TRIGGER trg_comments
AFTER INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'http://host.docker.internal:54321/functions/v1/notify',
  'POST',
  '{"Content-Type":"application/json","Authorization":"Bearer your-supabase-anon-key"}',
  '{}',
  '1000'
);

-- Revisions trigger
CREATE TRIGGER trg_revisions
AFTER INSERT ON public.revisions
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'http://host.docker.internal:54321/functions/v1/notify',
  'POST',
  '{"Content-Type":"application/json","Authorization":"Bearer your-supabase-anon-key"}',
  '{}',
  '1000'
);

-- Permissions trigger (for INSERT and UPDATE)
CREATE TRIGGER trg_permissions
AFTER INSERT OR UPDATE ON public.permissions
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role OR OLD IS NULL)
EXECUTE FUNCTION supabase_functions.http_request(
  'http://host.docker.internal:54321/functions/v1/notify',
  'POST',
  '{"Content-Type":"application/json","Authorization":"Bearer your-supabase-anon-key"}',
  '{}',
  '1000'
);

-- Create trigger for UPDATE on notifications table
CREATE TRIGGER trg_notifications_update
AFTER UPDATE ON public.notifications
FOR EACH ROW
WHEN (OLD.is_read IS DISTINCT FROM NEW.is_read)
EXECUTE FUNCTION supabase_functions.http_request(
  'http://host.docker.internal:54321/functions/v1/notify',
  'POST',
  '{"Content-Type":"application/json","Authorization":"Bearer your-supabase-anon-key"}',
  '{}',
  '1000'
);