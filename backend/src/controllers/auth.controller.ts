import { NextFunction, Request, Response } from 'express';
import {
  deleteArticleDB,
  getArticlesByUser,
  getUserPermission
} from '../helpers/supabaseHelper';
import supabase from '../api/supabase';
import { PlayAutomatorFactory } from '../services/mediawikiAPI/MediawikiAutomator';
import wikipediaApi from '../services/wikipedia/WikipediaApi';
import MediawikiClient from '../services/mediawikiAPI/MediawikiClient';

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
      `^/(${wikiadviserLanguagesRegex})/index.php/([0-9a-f-]{1,36})([?/]|$)`,
      'i'
    );
    const allowedPrefixRegEx = new RegExp(
      `^(favicon.ico|(/(${wikiadviserLanguagesRegex})/(load.php?|(skins|resources)/)))`,
      'i'
    );

    if (!user || !(typeof forwardedUri === 'string')) {
      return res
        .status(403)
        .send('This user is not authorized to access to this content');
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
          .send('This user is not authorized to access to this content');
      }
    }
    return res.sendStatus(200);
  } catch (error) {
    return next(error);
  }
}

export async function deleteUser(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const articles = await getArticlesByUser(id);

    for (const article of articles) {
      const mediawiki = new MediawikiClient(
        article['language'],
        wikipediaApi,
        await PlayAutomatorFactory(article['language'])
      );
      await mediawiki.deleteArticleMW(article.article_id);
      await deleteArticleDB(article.article_id);
    }
    await supabase.auth.admin.deleteUser(id as string);

    next({});
  } catch (error) {
    next(error);
  }
}
