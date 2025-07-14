// supabase/functions/notify/index.ts
import { Hono } from "hono";
import { corsMiddleware } from "../_shared/middleware/cors.ts";
import createSupabaseClient from "../_shared/supabaseClient.ts";
import { z } from "zod";

// ------------------------------------------------------------------
// Schema & types
// ------------------------------------------------------------------
const NotificationSchema = z.object({
  type: z.enum(["INSERT", "UPDATE", "DELETE"]),
  table: z.string(),
  record: z.any(),
  old_record: z.any().optional(),
});
type Payload = z.infer<typeof NotificationSchema>;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
interface RecipientRow {
  user_id: string;
}

async function safeSingle<T>(query: any): Promise<T | null> {
  const { data, error } = await query.single();
  return error ? null : data;
}

// ------------------------------------------------------------------
// Core logic
// ------------------------------------------------------------------
async function handleDbChange(payload: Payload) {
  const sup = createSupabaseClient();
  const notifications: { user_id: string; message: string }[] = [];

  try {
    /* 1. new revision */
    if (payload.table === "revisions" && payload.type === "INSERT") {
      const { article_id, created_by } = payload.record as {
        article_id: string;
        created_by: string;
      };

      const article = await safeSingle<{ title: string }>(
        sup.from("articles").select("title").eq("id", article_id)
      );
      if (!article) return;

      const { data: recipients } = await sup
        .from("article_users")
        .select("user_id")
        .eq("article_id", article_id)
        .in("role", ["Owner", "Editor"]);

      recipients?.forEach(({ user_id }: RecipientRow) => {
        if (user_id !== created_by) {
          notifications.push({
            user_id,
            message: `A new revision to ${article.title} has been made.`,
          });
        }
      });
    }

    /* 2. user added to article */
    if (payload.table === "article_users" && payload.type === "INSERT") {
      const { article_id, user_id, role, user_name } = payload.record as {
        article_id: string;
        user_id: string;
        role: string;
        user_name: string;
      };

      const article = await safeSingle<{ title: string }>(
        sup.from("articles").select("title").eq("id", article_id)
      );
      if (!article) return;

      // notify the new user
      notifications.push({
        user_id,
        message: `You have been granted ${role} permission to ${article.title}.`,
      });

      const { data: others } = await sup
        .from("article_users")
        .select("user_id")
        .eq("article_id", article_id)
        .in("role", ["Owner", "Editor"])
        .neq("user_id", user_id); // Exclude the new user

      others?.forEach(({ user_id: uid }: RecipientRow) => {
        notifications.push({
          user_id: uid,
          message: `${user_name} has been granted access to ${article.title}.`,
        });
      });
    }

    /* 3. new comment on a change */
    if (payload.table === "comments" && payload.type === "INSERT") {
      const { change_id, created_by, user_name } = payload.record as {
        change_id: string;
        created_by: string;
        user_name: string;
      };

      const change = await safeSingle<{
        article_id: string;
        created_by: string;
      }>(sup.from("change_requests").select("article_id, created_by").eq("id", change_id));
      if (!change) return;

      const article = await safeSingle<{ title: string }>(
        sup.from("articles").select("title").eq("id", change.article_id)
      );
      if (!article) return;

      const { data: participants } = await sup
        .from("change_comments")
        .select("created_by")
        .eq("change_id", change_id);

      const ids = new Set<string>([
        change.created_by,
        ...(participants?.map((p: { created_by: string }) => p.created_by) || []),
      ]);

      ids.forEach((uid: string) => {
        if (uid !== created_by) {
          notifications.push({
            user_id: uid,
            message: `${user_name} has replied to your change on article ${article.title}.`,
          });
        }
      });
    }

    if (notifications.length) {
      const { error } = await sup.from("notifications").insert(notifications);
      if (error) {
        console.error("Error inserting notifications:", error);
      }
    }
  } catch (error) {
    console.error("Error handling database change:", error);
    throw error;
  }
}

// ------------------------------------------------------------------
// Hono app
// ------------------------------------------------------------------
const app = new Hono().basePath("/notify");
app.use("*", corsMiddleware);

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const parse = NotificationSchema.safeParse(body);
    if (!parse.success) {
      console.error("Invalid payload:", parse.error);
      return c.text("Bad payload", 400);
    }

    await handleDbChange(parse.data);
    return c.text("ok", 200);
  } catch (err) {
    console.error("notify error:", err);
    return c.text("internal error", 500);
  }
});

Deno.serve(app.fetch);