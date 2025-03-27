import { cors } from "hono/cors";
import { ENV } from "../schema/env.schema.ts";

const allowedOrigins = [
  ENV.WIKIADVISER_FRONTEND_ENDPOINT,
  ENV.MEDIAWIKI_ENDPOINT,
];

const corsMiddleware = cors({
  origin: (origin: string | undefined) => {
    if (!origin) {
      return "*"; // Allow all origins if the origin is not present (e.g., for server-side requests)
    }
    if (allowedOrigins.includes(origin)) {
      return origin; // Allow if the origin is in the allowed list
    }
    return null; // Reject other origins
  },
  credentials: true,
});

export default corsMiddleware;
