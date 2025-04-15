import ENV from "./env.schema.ts";
import {
  getArticle,
  getUserPermission,
} from "../_shared/helpers/supabaseHelper.ts";
import SupabaseAuthorization from "../_shared/middleware/supabaseUserAuthorization.ts"; // Adjust path
import { Context } from "npm:hono@4.7.4";
import { User } from "npm:@supabase/supabase-js@2.49.4";

const wikiadviserLanguagesRegex = ENV.WIKIADVISER_LANGUAGES.join("|");

const articleIdRegEx = new RegExp(
  `^/wiki/(${wikiadviserLanguagesRegex})/index.php(\\?title=|/)([0-9a-f-]{36})(&|$|\\?)`,
  "i",
);

const allowedPrefixRegEx = new RegExp(
  `^/wiki/(${wikiadviserLanguagesRegex})/(images/thumb|load.php\\?|api.php\\?action=(editcheckreferenceurl|query|templatedata)&format=json&(formatversion=2&)?(url|meta=(filerepoinfo|siteinfo)|(revids=\\d+&prop=mapdata|titles=)|prop=(imageinfo(&indexpageids=1&iiprop=size%7Cmediatype|&iiprop=url&iiurlwidth=300&iiurlheight=)?|info%7Cpageprops%7Cpageimages%7Cdescription&pithumbsize=80&pilimit=1&ppprop=disambiguation%7Chiddencat)&titles=)|(skins|resources|images/timeline)/|extensions/(UniversalLanguageSelector|Kartographer|wikihiero))`,
  "i",
);

function hasAllowedPrefix(
  forwardedUri: string,
  forwardedMethod: string | undefined,
): boolean {
  // Check specific POST endpoints
  if (forwardedMethod === "POST") {
    const exactMatchPrefixes = ENV.WIKIADVISER_LANGUAGES.map(
      (lang: string) => `/wiki/${lang}/api.php`,
    );
    if (exactMatchPrefixes.some((prefix) => forwardedUri === prefix)) {
      return true;
    }
  }
  return !!forwardedUri.match(allowedPrefixRegEx);
}

function getArticleIdFromRequest(
  forwardedUri: string,
  context: Context,
): string | null {
  const articleIdFromUri = forwardedUri.match(articleIdRegEx)?.[3];
  if (articleIdFromUri) {
    return articleIdFromUri;
  }

  const isVisualEditorAction = context.req.query("action") === "visualeditor";
  const startsWithApi = ENV.WIKIADVISER_LANGUAGES.some((lang: string) =>
    forwardedUri.startsWith(`/wiki/${lang}/api.php?`)
  );

  if (isVisualEditorAction && startsWithApi) {
    return (context.req.query("page") as string) || null;
  }

  return null; // No article ID found
}

function isViewArticleRequest(forwardedUri: string): boolean {
  return forwardedUri.match(articleIdRegEx)?.[4] === "";
}

async function checkPermissions(
  articleId: string,
  user: User | null,
  isViewRequest: boolean,
): Promise<{ authorized: boolean; message: string }> {
  const article = await getArticle(articleId);
  const isPublicArticle = article?.web_publication ?? false;
  if (!user && !isPublicArticle) {
    return {
      authorized: false,
      message: "You are not authorized to access this content (login required)",
    };
  }

  let permission: string | null = null;
  if (user) {
    permission = await getUserPermission(articleId, user.id);
  }

  if (user && !permission && !isPublicArticle) {
    return {
      authorized: false,
      message:
        "This user is not authorized to access this content (missing permission)",
    };
  }

  const hasViewerRights = (permission &&
    ["viewer", "reviewer", "editor"].includes(permission)) ||
    isPublicArticle;
  if (hasViewerRights && !isViewRequest) {
    const isOnlyViewer = (permission === "viewer") ||
      (!permission && isPublicArticle);
    if (isOnlyViewer) {
      return {
        authorized: false,
        message:
          "This user is not authorized to access this content (editor permissions required)",
      };
    }
  }

  if (!hasViewerRights) {
    return {
      authorized: false,
      message:
        "You are not authorized to access this content (no access rights)",
    };
  }
  return { authorized: true, message: "OK" };
}

export default async function restrictMediawikiAccess(
  context: Context,
): Promise<Response> {
  const forwardedUri = context.req.header("x-forwarded-uri");
  const forwardedMethod = context.req.header("x-forwarded-method");

  if (typeof forwardedUri !== "string") {
    console.warn("Missing x-forwarded-uri header");
    return new Response("Bad Request: Missing routing information", {
      status: 400,
    });
  }
  const authHandler = new SupabaseAuthorization();
  const userResponse = await authHandler.verifyCookie(context);
  const user = userResponse && 'id' in userResponse ? userResponse : null;
  if (hasAllowedPrefix(forwardedUri, forwardedMethod)) {
    return new Response(null, { status: 200 }); // Allow access
  }
  const articleId = getArticleIdFromRequest(forwardedUri, context);
  if (!articleId) {
    console.warn("Could not extract article ID from URI:", forwardedUri);
    return new Response("Forbidden: Unable to identify target resource", {
      status: 403,
    });
  }
  const isViewRequest = isViewArticleRequest(forwardedUri);
  const permissionResult = await checkPermissions(
    articleId,
    user,
    isViewRequest,
  );

  if (!permissionResult.authorized) {
    return new Response(permissionResult.message, { status: 403 });
  }
  return new Response(null, { status: 200 });
}
