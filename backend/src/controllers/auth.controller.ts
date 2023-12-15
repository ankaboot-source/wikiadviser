import { NextFunction, Request, Response } from 'express';
import { deleteArticleDB, getUserPermission } from '../helpers/supabaseHelper';
import supabase from '../api/supabase';
import { User } from '@supabase/supabase-js';
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
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { data: articleData, error: articleError } = await supabase
      .from('permissions')
      .select(
        `
      id,
      article_id,
      role,
      articles(title,description,created_at,language)
      `
      )
      .eq('user_id', id as string)
      .eq('role', 'owner');
    if (articleError) {
      throw new Error(articleError.message);
    }

    const articles: any[] = articleData
      .filter((article) => article.role !== null)
      .map((article: any) => ({
        article_id: article.article_id,
        title: article.articles.title,
        description: article.articles.description,
        permission_id: article.id,
        role: article.role,
        language: article.articles.language,
        created_at: new Date(article.articles.created_at)
      }));

    for (let article of articles) {
      const mediawiki = new MediawikiClient(
        article['language'],
        wikipediaApi,
        await PlayAutomatorFactory(article['language'])
      );
      await mediawiki.deleteArticleMW(article.article_id);
      await deleteArticleDB(article.article_id);
    }
    await supabase.auth.admin.deleteUser(id as string);
  } catch (error) {
    return next(error);
  }
}
