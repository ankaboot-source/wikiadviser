import supabase from "../_shared/supabaseClient.ts";
import { Enums } from "./types.ts";

export async function getArticle(articleId: string) {
  const { data: articleData, error: articleError } = await supabase()
    .from("articles")
    .select("*")
    .eq("id", articleId)
    .single();
  if (articleError) {
    throw new Error(articleError.message);
  }
  return articleData;
}

export async function getUserPermission(
  articleId: string,
  userId: string,
): Promise<Enums<"role"> | null> {
  const { data } = await supabase()
    .from("permissions")
    .select()
    .eq("user_id", userId)
    .eq("article_id", articleId)
    .maybeSingle();

  return data?.role;
}
