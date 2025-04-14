import createSupabaseAdmin from "../_shared/supabaseAdmin.ts";
import { Request, Response } from "npm:express@4.18.2";
import { Database } from "../_shared/types/database.types.ts";

type ShareLink = Database["public"]["Tables"]["share_links"]["Row"] & {
  role: string;
};
type Permission = Database["public"]["Tables"]["permissions"]["Row"];

export async function createShareLink(req: Request, res: Response) {
  try {
    const { user } = res.locals;
    const { article_id: articleId, expires_at: expiresAt, role } = req.body;

    const supabaseAdmin = createSupabaseAdmin();

    if (!articleId && !expiresAt) {
      return res.status(400).send("Invalid request body");
    }

    const { data: permission, error: permissionError } = await supabaseAdmin
      .from("permissions")
      .select("id")
      .eq("user_id", user.id)
      .eq("article_id", articleId)
      .eq("role", "owner")
      .single<Permission>();

    if (permissionError || !permission) {
      return res.status(403).send("Insufficient permissions");
    }

    const { data: shareLink, error: shareLinkError } = await supabaseAdmin
      .from("share_links")
      .insert({
        article_id: articleId,
        expired_at: expiresAt,
        role,
      })
      .select("id, article_id, expired_at, role")
      .single<ShareLink>();

    if (shareLinkError) {
      throw shareLinkError;
    }

    return res.status(201).json(shareLink);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unknown error occurred";
    return res.status(500).json({ message });
  }
}

export async function verifyShareLink(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const { user } = res.locals;

    const supabaseAdmin = createSupabaseAdmin();

    const { data: shareRecord, error: shareError } = await supabaseAdmin
      .from("share_links")
      .select("*")
      .eq("id", token)
      .order("expired_at")
      .single<ShareLink>();

    if (shareError || !shareRecord) {
      return res.status(404).send("Share link not found");
    }

    if (
      shareRecord.expired_at && new Date(shareRecord.expired_at) < new Date()
    ) {
      return res.status(403).send("Share link expired");
    }

    const { article_id: articleId, role } = shareRecord;

    const { data: articlePermissions, error: permissionsError } =
      await supabaseAdmin
        .from("permissions")
        .select()
        .eq("user_id", user.id)
        .returns<Permission[]>();

    if (permissionsError) {
      throw new Error(permissionsError.message);
    }

    const permissionExists = articlePermissions?.find(
      (permission) => permission.article_id === articleId,
    );

    if (permissionExists) {
      return res.status(200).json(shareRecord);
    }

    if (
      articlePermissions && articlePermissions.length >= user.allowed_articles
    ) {
      return res.status(402).json({
        message: "You have reached the maximum number of articles allowed.",
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from("permissions")
      .insert(
        {
          user_id: user.id,
          article_id: articleId,
          role: role as "owner" | "editor" | "reviewer" | "viewer",
        } satisfies Partial<Permission>,
      );

    if (insertError) {
      throw new Error(insertError.message);
    }

    return res.status(200).json(shareRecord);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unknown error occurred";
    return res.status(500).json({ message });
  }
}
