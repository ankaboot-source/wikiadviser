import supabaseClient from "../_shared/supabaseClient.ts";
import { Context } from "hono";
import {
  deleteArticleDB,
  getUserArticlesCount,
  insertArticle,
} from "../_shared/helpers/supabaseHelper.ts";
import { MediawikiClient } from "./MediawikiClient.ts}";
import wikipediaApi from "../_shared/wikipedia/WikipediaApi.ts";
import { PlayAutomatorFactory } from "../_shared/mediawikiAPI/MediawikiAutomator.ts";

/**
 * Retrieves Wikipedia articles based on the provided search term and language.
 * @param {Context} context - The Hono context object.
 */
export async function createArticle(context: Context) {
  const { title, language, description } = await context.req.json();
  const user = context.get("user");
  let articleId = null;

  if (typeof title !== "string" || !title.length) {
    return context.json({
      message: "Title is required and must be a string.",
    }, 400);
  }

  if (typeof language !== "string" || !language.length) {
    return context.json({
      message: "Language is required and must be a string.",
    }, 400);
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
      return context.json({
        message: "You have reached the maximum number of articles allowed.",
      }, 402);
    }

    articleId = await insertArticle(
      title,
      user.id,
      language,
      description,
      false,
    );

    const mediawiki = new MediawikiClient(
      language,
      wikipediaApi,
      await PlayAutomatorFactory(language),
    );
    await mediawiki.createArticle(articleId, title);

    return context.json({
      message: "Creating new article succeeded.",
      articleId,
    }, 201);
  } catch (error) {
    if (articleId) {
      await deleteArticleDB(articleId);
    }
    throw error;
  }
}
