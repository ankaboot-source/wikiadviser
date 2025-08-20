DROP TRIGGER IF EXISTS trg_revisions ON public.revisions;
CREATE TRIGGER trg_revisions
AFTER INSERT ON public.revisions
FOR EACH ROW EXECUTE FUNCTION execute_notification_edge_function();