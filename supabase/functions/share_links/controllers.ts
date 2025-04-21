import createSupabaseAdmin from "../_shared/supabaseAdmin.ts";

import { Request, Response } from "express";
import { Database } from "../_shared/types/index.ts";

type ShareLink = Database["public"]["Tables"]["share_links"]["Row"];
type Permission = Database["public"]["Tables"]["permissions"]["Row"];

export async function createShareLink(req: Request, res: Response) {
  try {
    const { user } = res.locals;
    const { article_id: articleId, expires_at: expiresAt, role } = req.body;

    const supabaseAdmin = createSupabaseAdmin();

    if (!articleId && !expiresAt) {
      return res.status(400).send("Invalid request body");
    }

    const hasPermission = await supabaseAdmin
      .from<Permission>("permissions")
      .select("id")
      .eq("user_id", user.id)
      .eq("article_id", articleId)
      .eq("role", "owner")
      .single();

    if (!hasPermission) {
      return res.status(403).send("Insufficient permissions");
    }

    const { data: shareLink } = await supabaseAdmin
      .from<ShareLink>("share_links")
      .insert({
        article_id: articleId,
        expired_at: expiresAt,
        role,
      })
      .select("*")
      .single();

    return res.status(201).json({ ...shareLink });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function verifyShareLink(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const { user } = res.locals;

    const supabaseAdmin = createSupabaseAdmin();
    const {
      data: [shareRecord],
    } = await supabaseAdmin
      .from<ShareLink>("share_links")
      .select("*")
      .eq("id", token)
      .order("expired_at")
      .limit(1);

    if (!shareRecord || shareRecord.length === 0) {
      return res.status(404).send("Share link not found");
    }

    if (new Date(shareRecord.expired_at) < new Date()) {
      return res.status(403).send("Share link expired");
    }

    const { article_id: articleId, role } = shareRecord;

    const { data: articlePermissions, error: articlesError } =
      await supabaseAdmin
        .from<Permission>("permissions")
        .select("*")
        .eq("user_id", user.id);

    if (articlesError) {
      throw new Error(articlesError.message);
    }

    const permissionExists = articlePermissions.find(
      (permission) => permission.article_id === articleId
    );

    if (permissionExists) {
      return res.status(200).json({ ...shareRecord });
    }

    if (articlePermissions.length >= user.allowed_articles) {
      return res.status(402).json({
        message: "You have reached the maximum number of articles allowed.",
      });
    }

    await supabaseAdmin.from<Permission>("permissions").insert({
      user_id: user.id,
      article_id: articleId,
      role,
    });

    return res.status(200).json({ ...shareRecord });
  } catch (error) {
    return res.status(500).send(error.message);
  }
}
