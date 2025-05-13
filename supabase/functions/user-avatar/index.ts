import { corsMiddleware } from "../_shared/middleware/cors.ts";
import { Hono } from "hono";
import { updateUserAvatar } from "./updateUserAvatar.ts";
import { deleteUserAvatar } from "./deleteUserAvatar.ts";
import { handleError } from "./handleError.ts";

const functionName = "user-avatar";
const app = new Hono().basePath(`/${functionName}`);
// Middleware to handle CORS
app.use("*", corsMiddleware);

// Add routes
app.post("/", updateUserAvatar);
app.delete("/:id", deleteUserAvatar);

// Error handling middleware should be added last
app.onError(handleError);
Deno.serve((req) => {
  return app.fetch(req);
});
