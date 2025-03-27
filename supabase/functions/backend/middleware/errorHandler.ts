import { Context } from "hono";
import { ErrorResponse } from "../types/index.ts";
import { ENV } from "../schema/env.schema.ts";
import * as http from "std/http/http_status.ts";

const { NODE_ENV } = ENV;

export default function errorHandler(
  error: Error,
  c: Context,
) {
  console.error(error);

  const code: number = c.res.status !== 200 ? c.res.status : 500;
  c.status(code as http.Status);

  const response: ErrorResponse = {
    message: error.message,
  };

  if (NODE_ENV !== "production") {
    if (error.stack) {
      response.stack = error.stack;
    }
  }

  console.error(error);
  return c.json({ ...response });
}
