import { Context } from "hono";
import {
  deleteArticleDB,
  getUserArticlesCount,
  insertArticle,
} from "../_shared/helpers/supabaseHelper.ts";
import createSupabaseClient from "../_shared/supabaseClient.ts";
import wikipediaApi from "../_shared/wikipedia/WikipediaApi.ts";
import MediawikiClient from "./MediawikiClient.ts";

export async function importArticle(context: Context) {
  const { title, language, description } = await context.req.json();
  let articleId = null;
  const supabaseClient = createSupabaseClient(
    context.req.header("Authorization")
  );

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  try {
    const totalUserArticles = await getUserArticlesCount(user.id);
    const { allowed_articles: allowedArticles } = (
      await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
    ).data;

    if (totalUserArticles >= allowedArticles) {
      return context.json(
        { message: "You have reached the maximum number of articles allowed." },
        402
      );
    }

    articleId = await insertArticle(
      title,
      user.id,
      language,
      description,
      true
    );

    const mediawiki = new MediawikiClient(language, wikipediaApi);
    await mediawiki.importArticle(articleId, title);

    return context.json(
      {
        message: "Importing new article succeeded.",
        articleId,
      },
      201
    );
  } catch (error) {
    if (articleId) {
      await deleteArticleDB(articleId);
    }
    return context.json(
      {
        message: "An error occurred while processing your request",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
