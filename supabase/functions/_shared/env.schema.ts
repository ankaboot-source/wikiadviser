import z from "npm:zod@3.24.2";

const envSchema = z.object({
  SUPABASE_URL: z
    .string({
      required_error: "😱 You forgot to add a Supabase URL!",
    })
    .url(),
  SUPABASE_ANON_KEY: z
    .string({
      required_error: "😱 You forgot to add a Supabase secret token!",
    })
    .trim()
    .min(1),
  WIKIADVISER_LANGUAGES: z
    .string({
      required_error: "😱 You forgot to add a WikiAdviser languages!",
    })
    .transform((str) => {
      const regex = /^[a-z]{2,3}(,[a-z]{2,3})*$/g;
      if (!regex.test(str)) {
        throw new Error(
          "😱 WikiAdviser languages format is wrong! (E.g.:= en,fr,ar)",
        );
      }
      return str.split(",");
    }),
});

const envServer = envSchema.safeParse({
  SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
  SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY"),
  WIKIADVISER_LANGUAGES: Deno.env.get("WIKIADVISER_LANGUAGES"),
});

if (!envServer.success) {
  console.error(envServer.error.issues);
  Deno.exit(1);
}

export default envServer.data;
