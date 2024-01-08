import { NextFunction, Request, Response } from 'express';
import { getUserPermission } from '../helpers/supabaseHelper';

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
      `^/(${wikiadviserLanguagesRegex})/index.php\\?title=([0-9a-f-]{1,36})(&|$)`,
      'i'
    );

    const allowedPrefixRegEx = new RegExp(
      `^(favicon.ico|(/(${wikiadviserLanguagesRegex})/(load.php?|(skins|resources)/)))`,
      'i'
    );

    if (!user || !(typeof forwardedUri === 'string')) {
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
        : forwardedUri.match(articleIdRegEx)?.[2];

      const permission = articleId
        ? await getUserPermission(articleId, user.id)
        : null;

      if (!permission) {
        return res
          .status(403)
          .send('This user does not have a permission to access this content');
      }

      const isViewArticle = forwardedUri.match(articleIdRegEx)?.[3] === '';
      const isViewer = ['viewer', 'reviewer'].includes(permission);
      if (isViewer && !isViewArticle) {
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
