import { NextFunction, Request, Response } from 'express';
import logger from '../logger';
import { ErrorResponse } from '../types';
import { env } from '../schema/env.schema';

const { NODE_ENV } = env;

export default function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  __next: NextFunction // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  const code = res.statusCode !== 200 ? res.statusCode : 500;

  const response: ErrorResponse = {
    message: error.message
  };

  if (NODE_ENV !== 'production') {
    if (error.stack) {
      response.stack = error.stack;
    }
  }

  logger.error(error);
  return res.status(code).send({ ...response });
}
