import { z } from "zod";

const envSchema = z.object({
  SUPABASE_PROJECT_URL: z
    .string({
      required_error: "😱 You forgot to add a Supabase URL!",
    })
    .url(),
  SUPABASE_SECRET_PROJECT_TOKEN: z
    .string({
      required_error: "😱 You forgot to add a Supabase secret token!",
    })
    .trim()
    .min(1),
  WIKIADVISER_LANGUAGES: z
    .string({
      required_error: "😱 You forgot to add a WikiAdviser languages!",
    })
    .transform((str: string) => {
      const regex = /^[a-z]{2,3}(,[a-z]{2,3})*$/g;
      if (!regex.test(str)) {
        throw new Error(
          "😱 WikiAdviser languages format is wrong! (E.g.:= en,fr,ar)",
        );
      }
      return str.split(",");
    }),
  WIKIADVISER_API_PORT: z.coerce
    .number()
    .positive()
    .max(65536, "Port should be >= 0 and < 65536")
    .default(3000),
  WIKIADVISER_FRONTEND_ENDPOINT: z
    .string({
      required_error: "😱 You forgot to add a front-end URL!",
    })
    .url(),
  WIKIPEDIA_PROXY: z
    .string({
      required_error: "😱 You forgot to add a Wikipedia proxy URL!",
    })
    .url(),
  MEDIAWIKI_INTERNAL_ENDPOINT: z
    .string({
      required_error: "😱 You forgot to add a MediaWiki internal endpoint!",
    })
    .url(),
  MEDIAWIKI_ENDPOINT: z
    .string({
      required_error: "😱 You forgot to add a MediaWiki endpoint!",
    })
    .url(),
  MW_ADMIN_USERNAME: z
    .string({
      required_error: "😱 You forgot to add a MediaWiki admin username!",
    })
    .trim()
    .min(1),
  MW_ADMIN_PASSWORD: z
    .string({
      required_error: "😱 You forgot to add a MediaWiki admin password!",
    })
    .trim()
    .min(1),
  MW_BOT_USERNAME: z
    .string({
      required_error: "😱 You forgot to add a MediaWiki bot username!",
    })
    .min(1),
  MW_BOT_PASSWORD: z
    .string({
      required_error: "😱 You forgot to add a MediaWiki bot password!",
    })
    .min(1),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENV_BACKEND: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default(
    "development",
  ),
});

// Get environment variables from Deno.env.get
const envVars: Record<string, string | undefined> = {
  SUPABASE_PROJECT_URL: Deno.env.get("SUPABASE_PROJECT_URL"),
  SUPABASE_SECRET_PROJECT_TOKEN: Deno.env.get("SUPABASE_SECRET_PROJECT_TOKEN"),
  WIKIADVISER_LANGUAGES: Deno.env.get("WIKIADVISER_LANGUAGES"),
  WIKIADVISER_API_PORT: Deno.env.get("WIKIADVISER_API_PORT"),
  WIKIADVISER_FRONTEND_ENDPOINT: Deno.env.get("WIKIADVISER_FRONTEND_ENDPOINT"),
  WIKIPEDIA_PROXY: Deno.env.get("WIKIPEDIA_PROXY"),
  MEDIAWIKI_INTERNAL_ENDPOINT: Deno.env.get("MEDIAWIKI_INTERNAL_ENDPOINT"),
  MEDIAWIKI_ENDPOINT: Deno.env.get("MEDIAWIKI_ENDPOINT"),
  MW_ADMIN_USERNAME: Deno.env.get("MW_ADMIN_USERNAME"),
  MW_ADMIN_PASSWORD: Deno.env.get("MW_ADMIN_PASSWORD"),
  MW_BOT_USERNAME: Deno.env.get("MW_BOT_USERNAME"),
  MW_BOT_PASSWORD: Deno.env.get("MW_BOT_PASSWORD"),
  SENTRY_DSN: Deno.env.get("SENTRY_DSN"),
  SENTRY_ENV_BACKEND: Deno.env.get("SENTRY_ENV_BACKEND"),
  NODE_ENV: Deno.env.get("NODE_ENV"),
};

const envServer = envSchema.safeParse(envVars);

if (!envServer.success) {
  console.error("Environment variable validation error:");
  console.error(envServer.error.issues); // Using console.error instead of logger
  Deno.exit(1); // Using Deno.exit instead of process.exit
}

// Export the parsed environment variables
export const ENV = envServer.data;
