import { NextFunction, Request, Response } from 'express';
import { getArticle, getUserPermission } from '../helpers/supabaseHelper';

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
  const { user } = res.locals;

  try {
    const articleIdRegEx = new RegExp(
      `^/(${wikiadviserLanguagesRegex})/index.php\\?title=([0-9a-f-]{36})(&|$)`,
      'i'
    );

    const allowedPrefixRegEx = new RegExp(
      `^(favicon.ico|(/(${wikiadviserLanguagesRegex})/(load.php?|(skins|resources)/)))`,
      'i'
    );

    if (!(typeof forwardedUri === 'string')) {
      return res
        .status(403)
        .send('This user is not authorized to access to this content');
    }

    const articleIdForwardedUri = forwardedUri.match(articleIdRegEx)?.[2];
    const article = articleIdForwardedUri
      ? await getArticle(articleIdForwardedUri)
      : null;
    const isPublicArticle = article?.web_publication ?? null;
    if (!user && !isPublicArticle) {
      return res
        .status(403)
        .send('You are not authorized to access this content');
    }

    const forwardUriAllowedPrefixes = wikiadviserLanguages.map(
      (lang: string) => `/${lang}/api.php`
    );
    const forwardUriStartsWith = wikiadviserLanguages.map(
      (lang: string) => `/${lang}/api.php?`
    );

    const hasAllowedPrefixes =
      (forwardedMethod === 'POST' &&
        forwardUriAllowedPrefixes.some(
          (prefix: string) => forwardedUri === prefix
        )) ||
      forwardedUri.match(allowedPrefixRegEx);

    if (!hasAllowedPrefixes) {
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
          .send('This user is not authorized to access this content');
      }
      const permission = await getUserPermission(articleId, user.id);

      const isViewArticle = forwardedUri.match(articleIdRegEx)?.[3] === '';
      const isViewer = permission
        ? ['viewer', 'reviewer'].includes(permission)
        : null;
      if ((isViewer || isPublicArticle) && !isViewArticle) {
        return res
          .status(403)
          .send('This user is not authorized to access this content');
      }
    }
    return res.sendStatus(200);
  } catch (error) {
    return next(error);
  }
}
