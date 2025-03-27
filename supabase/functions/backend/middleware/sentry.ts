import * as Sentry from "@sentry/deno";

export default function initializeSentry(dsn: string, environment?: string) {
  Sentry.init({
    dsn: dsn,
    environment: environment,
    tracesSampleRate: 1.0,
  });

  console.info("Sentry integrated to the server ✔️.");
}
