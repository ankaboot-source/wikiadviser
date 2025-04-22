import z from "zod";

const envSchema = z.object({
  WIKIPEDIA_PROXY: z
    .string({
      required_error: "😱 You forgot to add a Wikipedia proxy URL!",
    })
    .url(),
});

const envServer = envSchema.safeParse({
  WIKIPEDIA_PROXY: Deno.env.get("WIKIPEDIA_PROXY"),
});

if (!envServer.success) {
  console.error(envServer.error.issues);
  Deno.exit(1);
}

export default envServer.data;
