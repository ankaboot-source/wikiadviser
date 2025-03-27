import { Context } from "hono";
import { getArticle, getUserPermission } from "../helper/supabaseHelper.ts";
import { ENV } from "../schema/env.schema.ts";
import { SupabaseAuthorization } from "../services/SupabaseResolver.ts";

const wikiadviserLanguagesRegex = ENV.WIKIADVISER_LANGUAGES.join("|");
const articleIdRegEx = new RegExp(
  `^/wiki/(${wikiadviserLanguagesRegex})/index.php(\\?title=|/)([0-9a-f-]{36})(&|$|\\?)`,
  "i",
);
export const allowedPrefixRegEx = new RegExp(
  `^/wiki/(${wikiadviserLanguagesRegex})/(images/thumb|load.php\\?|api.php\\?action=(editcheckreferenceurl|query|templatedata)&format=json&(url|meta=(filerepoinfo|siteinfo)|(formatversion=2&)?(revids=\\d+&prop=mapdata|titles=)|prop=(imageinfo(&indexpageids=1&iiprop=size%7Cmediatype)?|info%7Cpageprops%7Cpageimages%7Cdescription&pithumbsize=80&pilimit=1&ppprop=disambiguation%7Chiddencat)&titles=)|(skins|resources|images/timeline)/|extensions/(UniversalLanguageSelector|Kartographer|wikihiero))`,
  "i",
);

/**
 * Restricts access (HTTP 403) to MediaWiki endpoints based on user permissions and request details.
 *
 * @param {Context} c - The Hono context object.
 */
export async function restrictMediawikiAccess(
  c: Context,
) {
  const forwardedUri = c.req.header("x-forwarded-uri");
  const forwardedMethod = c.req.header("x-forwarded-method");
  const cookieHeader = c.req.header("cookie");

  try {
    const authHandler = new SupabaseAuthorization();
    const user = await authHandler.verifyCookie(cookieHeader);

    if (typeof forwardedUri !== "string") {
      return c.text("You are not authorized to access this content", 403);
    }

    const articleIdForwardedUri = forwardedUri.match(articleIdRegEx)?.[3];

    const forwardUriAllowedPrefixes = ENV.WIKIADVISER_LANGUAGES.map(
      (lang: string) => `/wiki/${lang}/api.php`,
    );
    const forwardUriStartsWith = ENV.WIKIADVISER_LANGUAGES.map(
      (lang: string) => `/wiki/${lang}/api.php?`,
    );

    const hasAllowedPrefixes = (forwardedMethod === "POST" &&
      forwardUriAllowedPrefixes.some(
        (prefix: string) => forwardedUri === prefix,
      )) ||
      forwardedUri.match(allowedPrefixRegEx);

    if (!hasAllowedPrefixes) {
      const article = articleIdForwardedUri
        ? await getArticle(articleIdForwardedUri)
        : null;
      const isPublicArticle = article?.web_publication ?? null;
      if (!user && !isPublicArticle) {
        return c.text("You are not authorized to access this content", 403);
      }

      const isRequestFromVisualEditor =
        forwardUriStartsWith.some((prefix: string) =>
          forwardedUri.startsWith(prefix)
        ) && c.req.query("action") === "visualeditor";

      const articleId = isRequestFromVisualEditor
        ? (c.req.query("page"))
        : articleIdForwardedUri;
      if (!articleId) {
        return c.text(
          "This user is not authorized to access this content, missing article",
          403,
        );
      }

      const permission = user
        ? await getUserPermission(articleId, user.id)
        : null;
      if (!permission && !isPublicArticle) {
        return c.text(
          "This user is not authorized to access this content, missing permission",
          403,
        );
      }

      const isViewArticle = forwardedUri.match(articleIdRegEx)?.[4] === "";
      const isViewer = permission
        ? ["viewer", "reviewer"].includes(permission)
        : isPublicArticle;

      if (isViewer && !isViewArticle) {
        return c.text(
          "This user is not authorized to access this content, editor permissions required",
          403,
        );
      }
    }
    return c.text("Ok", 200);
  } catch (error) {
    console.error("Error in restrictMediawikiAccess: ", error);
    return c.text("Oops! Something went wrong.", 500);
  }
}
