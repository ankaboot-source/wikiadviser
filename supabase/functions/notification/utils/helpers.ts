import { safeSingle } from './safeSingle.ts';
import createSupabaseAdmin from "../../_shared/supabaseAdmin.ts";

export async function getArticleTitle(articleId: string): Promise<string> {
  const supabase = createSupabaseAdmin();
  const article = await safeSingle<{ title: string }>(
    supabase.from('articles').select('title').eq('id', articleId)
  );
  return article?.title ?? 'Unknown Article';
}

export async function getUserEmail(userId: string): Promise<string> {
  const supabase = createSupabaseAdmin();
  const user = await safeSingle<{ email: string }>(
    supabase.from('profiles').select('email').eq('id', userId)
  );
  return user?.email ?? 'Unknown User';
}

export async function getUserRole(articleId: string, userId: string): Promise<string> {
  const supabase = createSupabaseAdmin();
  const permission = await safeSingle<{ role: string }>(
    supabase.from("permissions").select("role").eq("article_id", articleId).eq(
      "user_id",
      userId,
    ),
  );
  return permission?.role ?? "member";
}