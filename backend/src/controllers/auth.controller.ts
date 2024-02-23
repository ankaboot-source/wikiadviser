import { NextFunction, Request, Response } from 'express';
import { getArticle, getUserPermission } from '../helpers/supabaseHelper';
import logger from '../logger';
import SupabaseAuthorization from '../services/auth/SupabaseResolver';

const wikiadviserLanguages = JSON.parse(process.env.WIKIADVISER_LANGUAGES!);
const wikiadviserLanguagesRegex = wikiadviserLanguages.join('|');

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
      `^/wiki/(${wikiadviserLanguagesRegex})/(load.php\\?|api.php\\?action=query\\&format=json\\&(meta=(filerepoinfo|siteinfo)|prop=imageinfo\\&indexpageids=1&iiprop=size%7Cmediatype\\&titles=)|(skins|resources|extensions/UniversalLanguageSelector|images/timeline)/|extensions/Kartographer)`,
      'i'
    );

    if (!(typeof forwardedUri === 'string')) {
      return res
        .status(403)
        .send('You are not authorized to access this content');
    }

    const articleIdForwardedUri = forwardedUri.match(articleIdRegEx)?.[3];

    const forwardUriAllowedPrefixes = wikiadviserLanguages.map(
      (lang: string) => `/wiki/${lang}/api.php`
    );
    const forwardUriStartsWith = wikiadviserLanguages.map(
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
