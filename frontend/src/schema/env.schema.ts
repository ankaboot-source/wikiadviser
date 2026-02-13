import z from 'zod';

const envSchema = z.object({
  SUPABASE_PROJECT_URL: z
    .string({
      required_error: '😱 You forgot to add a Supabase URL!',
    })
    .url(),
  SUPABASE_ANON_KEY: z
    .string({
      required_error: '😱 You forgot to add a Supabase anon token!',
    })
    .trim()
    .min(1),
  WIKIADVISER_LANGUAGES: z
    .string({
      required_error: '😱 You forgot to add a WikiAdviser languages!',
    })
    .transform((str) => {
      const regex = /^[a-z]{2,3}(,[a-z]{2,3})*$/g;
      if (!regex.test(str)) {
        throw new Error(
          '😱 WikiAdviser languages format is wrong! (E.g.:= en,fr,ar)',
        );
      }
      return str.split(',');
    }),
  MEDIAWIKI_ENDPOINT: z
    .string({
      required_error: '😱 You forgot to add a MediaWiki endpoint!',
    })
    .url(),
  SHARE_LINK_DAY_LIMIT: z.coerce.number().min(1).default(2),
  SENTRY_DSN_FRONTEND: z.string().optional(),
  SENTRY_ENV_FRONTEND: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_API_HOST: z.string().optional(),
  USE_MIRA: z.boolean().default(false),
  AI_MODEL: z.string().default('google/gemini-2.5-flash-lite'),
});

const envServer = envSchema.safeParse({
  SUPABASE_PROJECT_URL: process.env.SUPABASE_PROJECT_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  WIKIADVISER_LANGUAGES: process.env.WIKIADVISER_LANGUAGES,
  MEDIAWIKI_ENDPOINT: process.env.MEDIAWIKI_ENDPOINT,
  SHARE_LINK_DAY_LIMIT: process.env.SHARE_LINK_DAY_LIMIT || undefined,
  SENTRY_DSN_FRONTEND: process.env.SENTRY_DSN_FRONTEND,
  SENTRY_ENV_FRONTEND: process.env.SENTRY_ENV_FRONTEND,
  POSTHOG_API_KEY: process.env.POSTHOG_API_KEY,
  POSTHOG_API_HOST: process.env.POSTHOG_API_HOST,
  USE_MIRA: process.env.USE_MIRA?.toLocaleLowerCase() === 'true' ? true : false,
  AI_MODEL: process.env.AI_MODEL,
});

if (!envServer.success) {
  console.log(envServer.error.issues);
  throw new Error(envServer.error.issues.toString());
}

export default envServer.data;
