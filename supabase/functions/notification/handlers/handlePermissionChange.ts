import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";
import { Notification, NotificationPayload } from "../schema.ts";
import { getArticleTitle, getUserEmail } from "../utils/helpers.ts";

export async function handlePermissionChange(
  payload: NotificationPayload,
): Promise<Notification[]> {
  const { type, record, old_record } = payload;
  const { user_id, article_id, role, granted_by } = record;
  const notifications: Notification[] = [];
  const articleTitle = await getArticleTitle(article_id);
  const userEmail = await getUserEmail(user_id);

  if (type === "INSERT") {
    const isArticleCreation = !granted_by || granted_by === user_id;

    if (!isArticleCreation) {
      // Self-notification for editor/reviewer
      if (role === "editor" || role === "reviewer") {
        notifications.push({
          user_id,
          article_id,
          type: "role",
          action: "create", // This will show "You have been granted..."
          triggered_by: granted_by,
          params: {
            role,
            articleTitle,
            isForSelf: true,
          },
          is_read: false,
        });
      }
    }

    // Notify other users about new owner/editor
    const supabase = createSupabaseAdmin();
    const { data: others, error } = await supabase
      .from("permissions")
      .select("user_id, role")
      .eq("article_id", article_id)
      .in("role", ["owner", "editor"])
      .neq("user_id", user_id);

    if (!error && others) {
      for (const { user_id: other_id, role: other_role } of others) {
        if ((role === "owner" || role === "editor") && other_role !== "owner") {
          notifications.push({
            user_id: other_id,
            article_id,
            type: "role",
            action: "create_others", // Different action for "others" notifications
            triggered_by: granted_by ?? user_id,
            params: {
              userName: userEmail,
              role,
              articleTitle,
              isForSelf: false,
            },
            is_read: false,
          });
        }
      }
    }
  }

  if (type === "UPDATE" && old_record?.role && old_record.role !== role) {
    const actualTriggeredBy = granted_by ?? user_id;

    if (granted_by !== user_id) {
      const supabase = createSupabaseAdmin();
      const { data: userRole, error } = await supabase
        .from("permissions")
        .select("role")
        .eq("article_id", article_id)
        .eq("user_id", user_id)
        .single();

      // Self-notification for role update
      if (!error && userRole?.role !== "owner") {
        notifications.push({
          user_id,
          article_id,
          type: "role",
          action: "update", // This will show "Your permission has been changed..."
          triggered_by: actualTriggeredBy,
          params: {
            role,
            articleTitle,
            isForSelf: true,
          },
          is_read: false,
        });
      }

      // Notify other editors about role changes
      const { data: others, error: othersError } = await supabase
        .from("permissions")
        .select("user_id, role")
        .eq("article_id", article_id)
        .eq("role", "editor")
        .neq("user_id", user_id);

      if (!othersError && others) {
        for (const { user_id: other_id } of others) {
          notifications.push({
            user_id: other_id,
            article_id,
            type: "role",
            action: "update_others", // Different action for others being notified about updates
            triggered_by: actualTriggeredBy,
            params: {
              userName: userEmail,
              role,
              articleTitle,
              isForSelf: false,
            },
            is_read: false,
          });
        }
      }
    }
  }

  return notifications;
}
