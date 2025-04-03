// import { getArticle, getUserPermission } from "../helpers/supabaseHelper";
import ENV from "../_shared/env.schema.ts";
import { getArticle, getUserPermission } from "./supabaseHelper.ts";
import SupabaseAuthorization from "./supabaseResolver.ts";
import { Context } from "npm:hono@4.7.4";

const wikiadviserLanguagesRegex = ENV.WIKIADVISER_LANGUAGES.join("|");

const articleIdRegEx = new RegExp(
  `^/wiki/(${wikiadviserLanguagesRegex})/index.php(\\?title=|/)([0-9a-f-]{36})(&|$|\\?)`,
  "i",
);

export const allowedPrefixRegEx = new RegExp(
  `^/wiki/(${wikiadviserLanguagesRegex})/(images/thumb|load.php\\?|api.php\\?action=(editcheckreferenceurl|query|templatedata)&format=json&(formatversion=2&)?(url|meta=(filerepoinfo|siteinfo)|(revids=\\d+&prop=mapdata|titles=)|prop=(imageinfo(&indexpageids=1&iiprop=size%7Cmediatype|&iiprop=url&iiurlwidth=300&iiurlheight=)?|info%7Cpageprops%7Cpageimages%7Cdescription&pithumbsize=80&pilimit=1&ppprop=disambiguation%7Chiddencat)&titles=)|(skins|resources|images/timeline)/|extensions/(UniversalLanguageSelector|Kartographer|wikihiero))`,
  "i",
);

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
      return new Response(
        "You are not authorized to access this content",
        { status: 403 },
      );
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
        return new Response(
          "You are not authorized to access this content",
          { status: 403 },
        );
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
          { status: 403 },
        );
      }

      const permission = user
        ? await getUserPermission(articleId, user.id)
        : null;
      if (!permission && !isPublicArticle) {
        return new Response(
          "This user is not authorized to access this content, missing permission",
          { status: 403 },
        );
      }

      const isViewArticle = forwardedUri.match(articleIdRegEx)?.[4] === "";
      const isViewer = permission
        ? ["viewer", "reviewer"].includes(permission)
        : isPublicArticle;

      if (isViewer && !isViewArticle) {
        return new Response(
          "This user is not authorized to access this content, editor permissions required",
          { status: 403 },
        );
      }
    }
    return new Response(null, { status: 200 });
  } catch (error) {
    throw error;
  }
}
