import z from "npm:zod@3.24.2";

const envSchema = z.object({
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
  WIKIADVISER_BACKGROUND_COLORS: z
    .string({
      required_error: "😱 You forgot to add WikiAdviser background colors!",
    })
    .transform((str: string) => {
      const regex = /^[0-9a-f]{6}(,[0-9a-f]{6})*$/gi;
      if (!regex.test(str)) {
        throw new Error(
          "😱 WikiAdviser background colors format is wrong! (E.g.:= f6f8fa,ffffff)",
        );
      }
      return str.split(",");
    }),
  WIKIPEDIA_PROXY: z
    .string()
    .url({ message: "😱 Invalid Wikipedia proxy URL!" })
    .optional(),
  MEDIAWIKI_ENDPOINT: z
    .string({
      required_error: "😱 You forgot to add a MediaWiki endpoint!",
    })
    .url(),
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
  X_API_KEY: z.string({
    required_error: "😱 You forgot to add a X_API_KEY key!",
  }),
  ROOT_DOMAIN: z.string({
    required_error: "😱 You forgot to add a ROOT_DOMAIN key!",
  }),
  SITE_URL: z.string({
    required_error: "😱 You forgot to add a SITE_URL key!",
  }),
});

const envServer = envSchema.safeParse({
  WIKIADVISER_LANGUAGES: Deno.env.get("WIKIADVISER_LANGUAGES"),
  WIKIADVISER_BACKGROUND_COLORS: Deno.env.get("WIKIADVISER_BACKGROUND_COLORS"),
  WIKIPEDIA_PROXY: Deno.env.get("WIKIPEDIA_PROXY") || undefined,
  MEDIAWIKI_ENDPOINT: Deno.env.get("MEDIAWIKI_ENDPOINT"),
  MW_BOT_USERNAME: Deno.env.get("MW_BOT_USERNAME"),
  MW_BOT_PASSWORD: Deno.env.get("MW_BOT_PASSWORD"),
  X_API_KEY: Deno.env.get("X_API_KEY"),
  ROOT_DOMAIN: Deno.env.get("ROOT_DOMAIN"),
  SITE_URL: Deno.env.get("SITE_URL")
});

if (!envServer.success) {
  console.error(envServer.error.issues);
  Deno.exit(1);
}

export default envServer.data;
