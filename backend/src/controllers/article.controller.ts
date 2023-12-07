import { NextFunction, Request, Response } from 'express';
import { parseArticle, ParseChanges } from '../helpers/parsingHelper';
import logger from '../logger';
import {
  deleteArticleDB,
  getArticle,
  getChanges,
  getUserPermission,
  insertArticle
} from '../helpers/supabaseHelper';
import MediawikiClient from '../services/mediawikiAPI/MediawikiClient';
import { PlayAutomatorFactory } from '../services/mediawikiAPI/MediawikiAutomator';
import wikipediaApi from '../services/wikipedia/WikipediaApi';

/**
 * Creates a new article and imports it into a MediaWiki instance.
 *
 * @param req - The Express request object.
 * @param res - The Express response object.
 */
export async function createArticle(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { title, language, description } = req.body;
  const { user } = res.locals;
  const articleId = await insertArticle(title, user.id, language, description);
  try {
    const mediawiki = new MediawikiClient(
      language,
      wikipediaApi,
      await PlayAutomatorFactory(language)
    );
    await mediawiki.importNewArticle(articleId, title);

    return res
      .status(201)
      .json({ message: 'Creating new article succeeded.', articleId });
  } catch (error) {
    await deleteArticleDB(articleId);
    return next(error);
  }
}

/**
 * Retrieves and parses the content of a specified article.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
export async function getParsedArticle(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { id: articleId } = req.params;
  try {
    const article = await getArticle(articleId);
    const changes = await getChanges(articleId);
    const content = await parseArticle(article, changes);
    logger.info({ articleId }, 'Get Parsed Article');
    return res
      .status(200)
      .json({ message: 'Getting article changes succeeded.', content });
  } catch (error) {
    return next(error);
  }
}

/**
 * Deletes a specified article from both the database and a MediaWiki instance.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
export async function deleteArticle(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { id: articleId } = req.params;
  try {
    const { language } = await getArticle(articleId);
    const mediawiki = new MediawikiClient(
      language,
      wikipediaApi,
      await PlayAutomatorFactory(language)
    );
    await mediawiki.deleteArticleMW(articleId);
    await deleteArticleDB(articleId);
    return res.status(200).json({ message: `Article ${articleId} deleted` });
  } catch (error) {
    return next(error);
  }
}

/**
 * Retrieves the changes made to a specified article.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
export async function getArticleChanges(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { id: articleId } = req.params;
  try {
    const changes = await getChanges(articleId);
    const Articlechanges = await ParseChanges(changes);
    logger.debug(`Getting Parsed Changes for article: ${articleId}`);
    return res.status(200).json({
      message: 'Getting article changes succeeded.',
      changes: Articlechanges
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Updates the changes made to a specified article in a MediaWiki instance.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
export async function updateArticleChanges(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { user } = res.locals;
  const { id: articleId } = req.params;
  try {
    const { language } = await getArticle(articleId);
    const mediawiki = new MediawikiClient(
      language,
      wikipediaApi,
      await PlayAutomatorFactory(language)
    );
    await mediawiki.updateChanges(articleId, user.id);

    logger.info({ articleId }, 'Updated Changes of article');
    return res.status(200).json({ message: 'Updating changes succeeded.' });
  } catch (error) {
    return next(error);
  }
}

/**
 * Middleware function that checks if the user has the required permissions.
 *
 * @param {string[]} permissions - The required permissions for accessing a specific resource.
 * @returns {(req: Request, res: Response, next: NextFunction) => Promise<void>} - Middleware function.
 */
export const hasPermissions =
  (permissions: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const { user } = res.locals;
    const { id: articleId } = req.params;
    try {
      const permission = await getUserPermission(articleId, user.id);
      const grantedPermissions = permissions.includes(permission);

      if (grantedPermissions) {
        return next();
      }
      return res
        .status(403)
        .json({ message: 'User does not have required permissions' });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Something unexpected has occurred try later';
      logger.error(message);
      return res.status(500).json({ message });
    }
  };
