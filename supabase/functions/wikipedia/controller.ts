import { Context } from "hono";
import wikipediaApi from "../_shared/wikipedia/WikipediaApi.ts";

/**
 * Retrieves Wikipedia articles based on the provided search term and language.
 * @param {Context} context - The Hono context object.
 */
export default async function getWikipediaArticle(context: Context) {
  const term = context.req.query("term");
  const language = context.req.query("language");
  try {
    if (typeof term !== "string" || typeof language !== "string") {
      throw new Error("Type mismatch in query params.");
    }

    const response = await wikipediaApi.getWikipediaArticles(term, language);
    return context.json(
      {
        message: "Getting Wikipedia articles succeeded.",
        searchResults: response,
      },
      200,
    );
  } catch (error) {
    return context.json(
      {
        message: "Error fetching Wikipedia articles.",
        error: (error as Error).message,
      },
      500,
    );
  }
}
