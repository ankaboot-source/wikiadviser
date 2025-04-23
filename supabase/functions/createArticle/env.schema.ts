import z from "zod";
const envSchema = z.object({
  MEDIAWIKI_INTERNAL_ENDPOINT: z
    .string({
      required_error: "😱 You forgot to add a MediaWiki internal endpoint!",
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
});

const envServer = envSchema.safeParse({
  MEDIAWIKI_INTERNAL_ENDPOINT: Deno.env.get("MEDIAWIKI_INTERNAL_ENDPOINT"),
  MW_ADMIN_USERNAME: Deno.env.get("MW_ADMIN_USERNAME"),
  MW_ADMIN_PASSWORD: Deno.env.get("MW_ADMIN_PASSWORD"),
});

if (!envServer.success) {
  console.error(envServer.error.issues);
  Deno.exit(1);
}

export default envServer.data;
