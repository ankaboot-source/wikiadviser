import { Context } from "hono";
import {
  getArticle,
  getUserPermission,
} from "../_shared/helpers/supabaseHelper.ts";
import SupabaseAuthorization from "../_shared/middleware/supabaseUserAuthorization.ts"; // Adjust path
import ENV from "./env.schema.ts";

import { allowedPrefixRegEx, articleIdRegEx } from "./regex.ts";

/**
 * Restricts access (HTTP 403) to MediaWiki endpoints based on user permissions and request details.
 *
 * @param {context} Context - The Express request object.
 */
export default async function restrictMediawikiAccess(context: Context) {
  const forwardedUri = context.req.header("x-forwarded-uri");
  const forwardedMethod = context.req.header("x-forwarded-method");

  try {
    const authHandler = new SupabaseAuthorization();
    const user = await authHandler.verifyCookie(context);

    if (typeof forwardedUri !== "string") {
      return new Response("You are not authorized to access this content", {
        status: 403,
      });
    }

    const articleIdForwardedUri = forwardedUri.match(articleIdRegEx)?.[3];

    const forwardUriAllowedPrefixes = ENV.WIKIADVISER_LANGUAGES.map(
      (lang: string) => `/wiki/${lang}/api.php`
    );
    const forwardUriStartsWith = ENV.WIKIADVISER_LANGUAGES.map(
      (lang: string) => `/wiki/${lang}/api.php?`
    );

    const hasAllowedPrefixes =
      (forwardedMethod === "POST" &&
        forwardUriAllowedPrefixes.some(
          (prefix: string) => forwardedUri === prefix
        )) ||
      forwardedUri.match(allowedPrefixRegEx);

    if (!hasAllowedPrefixes) {
      const article = articleIdForwardedUri
        ? await getArticle(articleIdForwardedUri)
        : null;
      const isPublicArticle = article?.web_publication ?? null;
      if (!user && !isPublicArticle) {
        return new Response("You are not authorized to access this content", {
          status: 403,
        });
      }

      const isRequestFromVisualEditor =
        forwardUriStartsWith.some((prefix: string) =>
          forwardedUri.startsWith(prefix)
        ) && context.req.query("action") === "visualeditor";

      const articleId = isRequestFromVisualEditor
        ? (context.req.query("page") as string)
        : articleIdForwardedUri;
      if (!articleId) {
        return new Response(
          "This user is not authorized to access this content, missing article",
          { status: 403 }
        );
      }

      const permission = user
        ? await getUserPermission(articleId, user.id)
        : null;
      if (!permission && !isPublicArticle) {
        return new Response(
          "This user is not authorized to access this content, missing permission",
          { status: 403 }
        );
      }

      const isViewArticle = forwardedUri.match(articleIdRegEx)?.[4] === "";
      const isViewer = permission
        ? ["viewer", "reviewer"].includes(permission)
        : isPublicArticle;

      if (isViewer && !isViewArticle) {
        return new Response(
          "This user is not authorized to access this content, editor permissions required",
          { status: 403 }
        );
      }
    }
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error(error);
    throw error;
  }
}
