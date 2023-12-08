import { NextFunction, Request, Response } from 'express';
import wikipediaApi from '../services/wikipedia/WikipediaApi';

/**
 * Retrieves Wikipedia articles based on the provided search term and language.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
export default async function getWikipediaArticle(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { term, language } = req.query;
  try {
    if (typeof term !== 'string' || typeof language !== 'string') {
      throw new Error('Type mismatch in query params.');
    }

    const response = await wikipediaApi.getWikipediaArticles(term, language);
    return res.status(200).json({
      message: 'Getting Wikipedia articles succeeded.',
      searchResults: response
    });
  } catch (error) {
    return next(error);
  }
}
