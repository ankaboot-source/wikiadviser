import { NextFunction, Request, Response } from 'express';
import logger from '../logger';
import SupabaseCookieAuthorization from '../services/auth/SupabaseCookieResolver';

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
