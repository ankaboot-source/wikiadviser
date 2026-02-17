import { Context } from "npm:hono@4.7.4";
import {
  getArticle,
  getUserPermission,
} from "../_shared/helpers/supabaseHelper.ts";
import SupabaseAuthorization from "../_shared/middleware/supabaseUserAuthorization.ts"; // Adjust path
import ENV from "../_shared/schema/env.schema.ts";

import { allowedPrefixRegEx, articleIdRegEx } from "./regex.ts";

const UUID_REGEXP =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeParseForwardedUrl(forwardedUri: string): URL | null {
  try {
    return new URL(forwardedUri, "http://local");
  } catch {
    return null;
  }
}

function extractUuidCandidate(value: string | null): string | null {
  if (!value) return null;
  const first = value.split("|")[0];
  return UUID_REGEXP.test(first) ? first : null;
}

function isBareArticleView(forwardedUrl: URL, articleId: string): boolean {
  if (!/^\/wiki\/[a-z]{2,3}\/index\.php$/i.test(forwardedUrl.pathname)) {
    return false;
  }

  if (forwardedUrl.searchParams.get("title") !== articleId) {
    return false;
  }

  // Only allow the simple view URL for viewer/reviewer/public access.
  for (const key of forwardedUrl.searchParams.keys()) {
    if (key !== "title") return false;
  }
  return true;
}

/**
 * Restricts access (HTTP 403) to MediaWiki endpoints based on user permissions and request details.
 *
 * @param {context} Context - The Express request object.
 */
export default async function restrictMediawikiAccess(context: Context) {
  const forwardedUri = context.req.header("x-forwarded-uri");
  const forwardedMethod = context.req.header("x-forwarded-method");

  try {
    if (typeof forwardedUri !== "string") {
      return new Response("You are not authorized to access this content", {
        status: 403,
      });
    }

    // IMPORTANT: compute allowlisted paths before any auth/session calls.
    // This endpoint is used by Caddy forward_auth and can be called many times
    // while MediaWiki loads assets (load.php/resources/images...).
    const forwardUriAllowedPrefixes = ENV.WIKIADVISER_LANGUAGES.map(
      (lang: string) => `/wiki/${lang}/api.php`,
    );

    const hasAllowedPrefixes = (forwardedMethod === "POST" &&
        forwardUriAllowedPrefixes.some(
          (prefix: string) => forwardedUri === prefix,
        )) ||
      forwardedUri.match(allowedPrefixRegEx);

    if (hasAllowedPrefixes) {
      return new Response(null, { status: 200 });
    }

    const forwardedUrl = safeParseForwardedUrl(forwardedUri);
    const forwardedSearchParams = forwardedUrl?.searchParams;

    const articleIdFromIndexPhp = forwardedUri.match(articleIdRegEx)?.[3] ??
      null;
    const articleIdFromQuery = extractUuidCandidate(
      forwardedSearchParams?.get("title") ??
        forwardedSearchParams?.get("page") ??
        forwardedSearchParams?.get("titles") ??
        null,
    );

    const articleId = articleIdFromIndexPhp || articleIdFromQuery;
    const article = articleId ? await getArticle(articleId) : null;
    const isPublicArticle = article?.web_publication ?? null;

    // Allow public access for the bare view URL without a session.
    if (
      isPublicArticle &&
      forwardedUrl &&
      typeof articleId === "string" &&
      isBareArticleView(forwardedUrl, articleId)
    ) {
      return new Response(null, { status: 200 });
    }

    const authHandler = new SupabaseAuthorization();
    const user = await authHandler.verifyCookie(context);

    if (!user && !isPublicArticle) {
      return new Response("You are not authorized to access this content", {
        status: 403,
      });
    }

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

    const isViewer = permission
      ? ["viewer", "reviewer"].includes(permission)
      : isPublicArticle;

    if (isViewer) {
      const canView =
        forwardedUrl ? isBareArticleView(forwardedUrl, articleId) : false;
      if (!canView) {
        return new Response(
          "This user is not authorized to access this content, editor permissions required",
          { status: 403 },
        );
      }
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error(error);
    throw error;
  }
}
