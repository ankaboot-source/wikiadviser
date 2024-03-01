import z from 'zod';

const envSchema = z.object({
  SUPABASE_PROJECT_URL: z
    .string({
      required_error: '😱 You forgot to add a Supabase URL!',
    })
    .url(),
  SUPABASE_SECRET_PROJECT_TOKEN: z
    .string({
      required_error: '😱 You forgot to add a Supabase secret token!',
    })
    .trim()
    .min(1),
  WIKIADVISER_LANGUAGES: z
    .string({
      required_error: '😱 You forgot to add a WikiAdviser languages!',
    })
    .transform((str, ctx) => {
      try {
        return JSON.parse(`${str}`) as string[];
      } catch (err) {
        ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
        return z.NEVER;
      }
    }),
  WIKIADVISER_API_ENDPOINT: z
    .string({
      required_error: '😱 You forgot to add a front-end URL!',
    })
    .url(),
  MEDIAWIKI_ENDPOINT: z
    .string({
      required_error: '😱 You forgot to add a MediaWiki endpoint!',
    })
    .url(),
  SHARE_LINK_DAY_LIMIT: z.coerce.number().default(2),
  SENTRY_DSN_FRONTEND: z.string().optional(),
  SENTRY_ENV_FRONTEND: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_API_HOST: z.string().optional(),
});

const envServer = envSchema.safeParse({
  SUPABASE_PROJECT_URL: process.env.SUPABASE_PROJECT_URL,
  SUPABASE_SECRET_PROJECT_TOKEN: process.env.SUPABASE_SECRET_PROJECT_TOKEN,
  WIKIADVISER_LANGUAGES: process.env.WIKIADVISER_LANGUAGES,
  WIKIADVISER_API_ENDPOINT: process.env.WIKIADVISER_API_ENDPOINT,
  MEDIAWIKI_ENDPOINT: process.env.MEDIAWIKI_ENDPOINT,
  SHARE_LINK_DAY_LIMIT: process.env.SHARE_LINK_DAY_LIMIT,
  SENTRY_DSN_FRONTEND: process.env.SENTRY_DSN_FRONTEND,
  SENTRY_ENV_FRONTEND: process.env.SENTRY_ENV_FRONTEND,
  POSTHOG_API_KEY: process.env.POSTHOG_API_KEY,
  POSTHOG_API_HOST: process.env.POSTHOG_API_HOST,
});

if (!envServer.success) {
  console.log(envServer.error.issues);
  throw new Error(envServer.error.issues.toString());
}

export default envServer.data;
