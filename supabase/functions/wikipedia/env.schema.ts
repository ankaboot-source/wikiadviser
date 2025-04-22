import z from "zod";

const envSchema = z.object({
  WIKIPEDIA_PROXY: z
    .string({
      required_error: "😱 You forgot to add a Wikipedia proxy URL!",
    })
    .url(),
  WIKIADVISER_LANGUAGES: z
    .string({
      required_error: "😱 You forgot to add WikiAdviser languages!",
    })
    .transform((str) => {
      const regex = /^[a-z]{2,3}(,[a-z]{2,3})*$/g;
      if (!regex.test(str)) {
        throw new Error(
          "😱 WikiAdviser languages format is wrong! (E.g.:= en,fr,ar)"
        );
      }
      return str.split(",");
    }),
});

const envServer = envSchema.safeParse({
  WIKIPEDIA_PROXY: Deno.env.get("WIKIPEDIA_PROXY"),
  WIKIADVISER_LANGUAGES: Deno.env.get("WIKIADVISER_LANGUAGES"),
});

if (!envServer.success) {
  console.error(envServer.error.issues);
  Deno.exit(1);
}

export default envServer.data;
