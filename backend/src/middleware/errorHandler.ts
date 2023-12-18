import { NextFunction, Request, Response } from 'express';
import logger from '../logger';
import { ErrorResponse } from '../types';

export default function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  __next: NextFunction // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  const code = res.statusCode ?? 401;

  const response: ErrorResponse = {
    message: error.message 
  };

  logger.error(error.message, error);
  return res.status(code).send({ ...response });
}
