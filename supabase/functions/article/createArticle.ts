import { Context } from "hono";
import {
  deleteArticleDB,
  getUserArticlesCount,
  insertArticle,
} from "../_shared/helpers/supabaseHelper.ts";
import createSupabaseClient from "../_shared/supabaseClient.ts";
import wikipediaApi from "../_shared/wikipedia/WikipediaApi.ts";
import MediawikiClient from "./MediawikiClient.ts";
/**
 * Retrieves Wikipedia articles based on the provided search term and language.
 * @param {Context} context - The Hono context object.
 */
export async function createArticle(context: Context) {
  let articleId = null;
  const { title, language, description } = await context.req.json();

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

  if (typeof title !== "string" || !title.length) {
    return context.json(
      {
        message: "Title is required and must be a string.",
      },
      400
    );
  }

  if (typeof language !== "string" || !language.length) {
    return context.json(
      {
        message: "Language is required and must be a string.",
      },
      400
    );
  }

  try {
    const totalUserArticles = await getUserArticlesCount(user.id);
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("allowed_articles")
      .eq("id", user.id)
      .single();

    if (error) {
      return context.json({ message: error.message }, 500);
    }

    if (!data) {
      return context.json({ message: "User profile not found" }, 404);
    }

    const { allowed_articles: allowedArticles } = data;

    if (totalUserArticles >= allowedArticles) {
      return context.json(
        {
          message: "You have reached the maximum number of articles allowed.",
        },
        402
      );
    }

    articleId = await insertArticle(
      title,
      user.id,
      language,
      description,
      false
    );

    const mediawiki = new MediawikiClient(language, wikipediaApi);
    await mediawiki.createArticle(articleId, title);

    return context.json(
      {
        message: "Creating new article succeeded.",
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
