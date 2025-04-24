import { Context, Next } from "hono";
import {
  deleteArticleDB,
  getArticle,
  getUserPermission,
} from "../_shared/helpers/supabaseHelper.ts";
import MediawikiClient from "./MediawikiClient.ts";
import wikipediaApi from "../_shared/wikipedia/WikipediaApi.ts";

export const hasPermissions = (permissions: string[]) => {
  return async (c: Context, next: Next) => {
    try {
      const user = c.get("user"); // assuming user is already set in context
      const articleId = c.req.param("id"); // assuming your route uses /:id

      const permission = await getUserPermission(articleId, user.id);
      const grantedPermissions = permission
        ? permissions.includes(permission)
        : null;

      if (grantedPermissions) {
        await next();
      } else {
        return c.json(
          { message: "User does not have required permissions" },
          403,
        );
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Something unexpected has occurred, try later";
      console.log("Error in hasPermissions middleware:", message);
      return c.json({ message }, 500);
    }
  };
};
/**
 * Retrieves Wikipedia articles based on the provided search term and language.
 * @param {Context} context - The Hono context object.
 */
export async function deleteArticle(context: Context) {
  const articleId = context.req.param("id");

  try {
    const { language } = await getArticle(articleId);
    const mediawiki = new MediawikiClient(
      language,
      wikipediaApi,
    );
    await mediawiki.deleteArticleMW(articleId);
    await deleteArticleDB(articleId);
    return context.json({ message: `Article ${articleId} deleted` }, 200);
  } catch (error) {
    return context.json({
      message: "An error occurred while processing your request",
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}
