import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";
import { Notification, NotificationPayload } from "../schema.ts";
import { getArticleTitle, getUserEmail } from "../utils/helpers.ts";

async function getOwner(articleId: string): Promise<string | null> {
  const supabase = createSupabaseAdmin();
  const { data: owner, error } = await supabase
    .from("permissions")
    .select("user_id")
    .eq("article_id", articleId)
    .eq("role", "owner")
    .single();

  return error ? null : owner.user_id;
}

function createNotif(
  userId: string,
  articleId: string,
  action: string,
  triggeredBy: string,
  params: {
    role?: string;
    articleTitle?: string;
    userName?: string;
    isForSelf?: boolean;
  }
): Notification {
  return {
    user_id: userId,
    article_id: articleId,
    type: "role",
    action,
    triggered_by: triggeredBy,
    params,
    is_read: false,
  };
}

async function notifyOthers(
  articleId: string,
  excludeUserId: string,
  action: string,
  triggeredBy: string,
  params: {
    userName?: string;
    role?: string;
    articleTitle?: string;
    isForSelf?: boolean;
  },
  roleFilter: string[] = ["owner", "editor"]
): Promise<Notification[]> {
  const supabase = createSupabaseAdmin();
  const notifications: Notification[] = [];

  const { data: others, error } = await supabase
    .from("permissions")
    .select("user_id, role")
    .eq("article_id", articleId)
    .in("role", roleFilter)
    .neq("user_id", excludeUserId);

  if (!error && others) {
    for (const { user_id: otherId, role: otherRole } of others) {
      if (otherRole !== "owner") {
        notifications.push(
          createNotif(otherId, articleId, action, triggeredBy, params)
        );
      }
    }
  }

  return notifications;
}

async function shouldNotify(articleId: string, userId: string): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const { data: userRole, error } = await supabase
    .from("permissions")
    .select("role")
    .eq("article_id", articleId)
    .eq("user_id", userId)
    .single();

  return !error && userRole?.role !== "owner";
}

export async function handlePermissionChange(
  payload: NotificationPayload,
): Promise<Notification[]> {
  const { type, record, old_record } = payload;
  const { user_id, article_id, role } = record;
  const notifications: Notification[] = [];
  
  const articleTitle = await getArticleTitle(article_id);
  const userEmail = await getUserEmail(user_id);
  const triggeredBy = await getOwner(article_id);

  if (!triggeredBy) return [];

  if (type === "INSERT") {
    if (user_id === triggeredBy) return [];

    if (role === "editor" || role === "reviewer") {
      notifications.push(
        createNotif(user_id, article_id, "create", triggeredBy, {
          role,
          articleTitle,
          isForSelf: true,
        })
      );
    }

    if (role === "owner" || role === "editor") {
      const others = await notifyOthers(
        article_id,
        user_id,
        "create_others",
        triggeredBy,
        {
          userName: userEmail,
          role,
          articleTitle,
          isForSelf: false,
        }
      );
      notifications.push(...others);
    }
  }

  if (type === "UPDATE" && old_record?.role && old_record.role !== role) {
    if (user_id === triggeredBy) return notifications;

    if (await shouldNotify(article_id, user_id)) {
      notifications.push(
        createNotif(user_id, article_id, "update", triggeredBy, {
          role,
          articleTitle,
          isForSelf: true,
        })
      );
    }

    const others = await notifyOthers(
      article_id,
      user_id,
      "update_others",
      triggeredBy,
      {
        userName: userEmail,
        role,
        articleTitle,
        isForSelf: false,
      },
      ["editor"]
    );
    notifications.push(...others);
  }

  return notifications;
}