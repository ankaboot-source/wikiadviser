import z from 'zod';
// import logger from '../logger';

const envSchema = z.object({
  SUPABASE_PROJECT_URL: z
    .string({
      required_error: '😱 You forgot to add a Supabase URL!'
    })
    .url(),
  SUPABASE_SECRET_PROJECT_TOKEN: z
    .string({
      required_error: '😱 You forgot to add a Supabase secret token!'
    })
    .trim()
    .min(1),
  WIKIADVISER_LANGUAGES: z
    .string({
      required_error: '😱 You forgot to add a WikiAdviser languages!'
    })
    .transform((str) => {
      const regex = /^[a-z]{2,3}(,[a-z]{2,3})*$/g;
      if (!regex.test(str)) {
        throw new Error(
          '😱 WikiAdviser languages format is wrong! (E.g.:= en,fr,ar)'
        );
      }
      return str.split(',');
    }),
  WIKIADVISER_API_PORT: z.coerce
    .number()
    .positive()
    .max(65536, 'Port should be >= 0 and < 65536')
    .default(3000),
  WIKIADVISER_FRONTEND_ENDPOINT: z
    .string({
      required_error: '😱 You forgot to add a front-end URL!'
    })
    .url(),
  WIKIPEDIA_PROXY: z
    .string({
      required_error: '😱 You forgot to add a Wikipedia proxy URL!'
    })
    .url(),
  MEDIAWIKI_INTERNAL_ENDPOINT: z
    .string({
      required_error: '😱 You forgot to add a MediaWiki internal endpoint!'
    })
    .url(),
  MEDIAWIKI_ENDPOINT: z
    .string({
      required_error: '😱 You forgot to add a MediaWiki endpoint!'
    })
    .url(),
  MW_ADMIN_USERNAME: z
    .string({
      required_error: '😱 You forgot to add a MediaWiki admin username!'
    })
    .trim()
    .min(1),
  MW_ADMIN_PASSWORD: z
    .string({
      required_error: '😱 You forgot to add a MediaWiki admin password!'
    })
    .trim()
    .min(1),
  MW_BOT_USERNAME: z
    .string({
      required_error: '😱 You forgot to add a MediaWiki bot username!'
    })
    .min(1),
  MW_BOT_PASSWORD: z
    .string({
      required_error: '😱 You forgot to add a MediaWiki bot password!'
    })
    .min(1),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENV_BACKEND: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

const envServer = envSchema.safeParse({
  SUPABASE_PROJECT_URL: process.env.SUPABASE_PROJECT_URL,
  SUPABASE_SECRET_PROJECT_TOKEN: process.env.SUPABASE_SECRET_PROJECT_TOKEN,
  WIKIADVISER_LANGUAGES: process.env.WIKIADVISER_LANGUAGES,
  WIKIADVISER_API_PORT: process.env.WIKIADVISER_API_PORT,
  WIKIADVISER_FRONTEND_ENDPOINT: process.env.WIKIADVISER_FRONTEND_ENDPOINT,
  WIKIPEDIA_PROXY: process.env.WIKIPEDIA_PROXY,
  MEDIAWIKI_INTERNAL_ENDPOINT: process.env.MEDIAWIKI_INTERNAL_ENDPOINT,
  MEDIAWIKI_ENDPOINT: process.env.MEDIAWIKI_ENDPOINT,
  MW_ADMIN_USERNAME: process.env.MW_ADMIN_USERNAME,
  MW_ADMIN_PASSWORD: process.env.MW_ADMIN_PASSWORD,
  MW_BOT_USERNAME: process.env.MW_BOT_USERNAME,
  MW_BOT_PASSWORD: process.env.MW_BOT_PASSWORD,
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ENV_BACKEND: process.env.SENTRY_ENV_BACKEND,
  NODE_ENV: process.env.NODE_ENV
});

if (!envServer.success) {
  // logger.error(envServer.error.issues);
  console.error(envServer.error.issues);
  process.exit(1);
}

export default envServer.data;
