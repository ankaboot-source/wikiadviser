import { Request, Response, NextFunction } from 'express';
import SupabaseCookieAuthorization from '../services/auth/SupabaseCookieResolver';
import logger from '../logger';

/**
 * Authorization middleware for verifying user sessions.
 *
 * @param {Request} req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 * @param {NextFunction} next - The next middleware function.
 */
async function authorizationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { WIKIADVISER_API_IP } = process.env;
    const clientRemoteAddress = req.header('x-real-ip');

    // Authorize requests coming from backend
    if (
      clientRemoteAddress &&
      WIKIADVISER_API_IP &&
      clientRemoteAddress === WIKIADVISER_API_IP
    ) {
      return next();
    }

    const authHandler = new SupabaseCookieAuthorization(logger);
    const user = await authHandler.verifyCookie(req);

    if (!user) {
      return res.status(401).json({ message: 'Authorization denied' });
    }

    res.locals.user = user;

    return next();
  } catch (error) {
    return res
      .status(500)
      .json({ error: { message: 'Oops! Something went wrong.' } });
  }
}

export default authorizationMiddleware;
