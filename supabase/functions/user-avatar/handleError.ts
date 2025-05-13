import { Context } from "hono";

export function handleError(err: Error, c: Context) {
  console.error("Error:", err.message);

  if (err instanceof Error) {
    return c.json({ message: err.message }, 500);
  }

  return c.json({ message: "An unknown error occurred" }, 500);
}
