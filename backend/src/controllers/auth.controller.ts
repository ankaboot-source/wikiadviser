import { NextFunction, Request, Response } from 'express';
import { getArticle, getUserPermission } from '../helpers/supabaseHelper';
import logger from '../logger';
import ENV from '../schema/env.schema';
import SupabaseAuthorization from '../services/auth/SupabaseResolver';

const wikiadviserLanguagesRegex = ENV.WIKIADVISER_LANGUAGES.join('|');

/**
 * Restricts access to MediaWiki endpoints based on user permissions and request details.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
export default async function restrictMediawikiAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const forwardedUri = req.headers['x-forwarded-uri'];
  const forwardedMethod = req.headers['x-forwarded-method'];

  try {
    const authHandler = new SupabaseAuthorization(logger);
    const user = await authHandler.verifyCookie(req);

    const articleIdRegEx = new RegExp(
      `^/wiki/(${wikiadviserLanguagesRegex})/index.php(\\?title=|/)([0-9a-f-]{36})(&|$|\\?)`,
      'i'
    );

    const allowedPrefixRegEx = new RegExp(
      `^/wiki/(${wikiadviserLanguagesRegex})/(images/thumb|load.php\\?|api.php\\?action=(editcheckreferenceurl|query|templatedata)&format=json&(url|meta=(filerepoinfo|siteinfo)|(formatversion=2&)?(revids=\\d+&prop=mapdata|titles=Template%3ACite)|prop=(imageinfo(&indexpageids=1&iiprop=size%7Cmediatype)?|info%7Cpageprops%7Cpageimages%7Cdescription&pithumbsize=80&pilimit=1&ppprop=disambiguation%7Chiddencat)&titles=)|(skins|resources|images/timeline)/|extensions/(UniversalLanguageSelector|Kartographer|wikihiero))`,
      'i'
    );

    if (!(typeof forwardedUri === 'string')) {
      return res
        .status(403)
        .send('You are not authorized to access this content');
    }

    const articleIdForwardedUri = forwardedUri.match(articleIdRegEx)?.[3];

    const forwardUriAllowedPrefixes = ENV.WIKIADVISER_LANGUAGES.map(
      (lang: string) => `/wiki/${lang}/api.php`
    );
    const forwardUriStartsWith = ENV.WIKIADVISER_LANGUAGES.map(
      (lang: string) => `/wiki/${lang}/api.php?`
    );

    const hasAllowedPrefixes =
      (forwardedMethod === 'POST' &&
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
        return res
          .status(403)
          .send('You are not authorized to access this content');
      }

      const isRequestFromVisualEditor =
        forwardUriStartsWith.some((prefix: string) =>
          forwardedUri.startsWith(prefix)
        ) && req.query.action === 'visualeditor';

      const articleId = isRequestFromVisualEditor
        ? (req.query.page as string)
        : articleIdForwardedUri;
      if (!articleId) {
        return res
          .status(403)
          .send(
            'This user is not authorized to access this content, missing article'
          );
      }

      const permission = user
        ? await getUserPermission(articleId, user.id)
        : null;
      if (!permission && !isPublicArticle) {
        return res
          .status(403)
          .send(
            'This user is not authorized to access this content, missing permission'
          );
      }

      const isViewArticle = forwardedUri.match(articleIdRegEx)?.[4] === '';
      const isViewer = permission
        ? ['viewer', 'reviewer'].includes(permission)
        : isPublicArticle;

      if (isViewer && !isViewArticle) {
        return res
          .status(403)
          .send(
            'This user is not authorized to access this content, editor permissions required'
          );
      }
    }
    return res.sendStatus(200);
  } catch (error) {
    return next(error);
  }
}
