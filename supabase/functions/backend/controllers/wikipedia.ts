import { Context } from "hono";
import { WikipediaApi } from "../services/WikipediaApi.ts";

/**
 * Retrieves Wikipedia articles based on the provided search term and language.
 *
 * @param {Context} c - The Hono context object.
 */
export async function getWikipediaArticle(c: Context) {
  const term = c.req.query("term");
  const language = c.req.query("language");

  try {
    if (typeof term !== "string" || typeof language !== "string") {
      return c.json({ error: "Type mismatch in query params." }, 400);
    }

    const wikipediaApi = new WikipediaApi();
    const response = await wikipediaApi.getWikipediaArticles(term, language);

    return c.json({
      message: "Getting Wikipedia articles succeeded.",
      searchResults: response,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Failed to retrieve Wikipedia articles" }, 500);
  }
}
