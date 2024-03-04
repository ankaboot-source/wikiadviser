import posthog from 'posthog-js';
import { boot } from 'quasar/wrappers';
import ENV from 'src/schema/env.schema';

export default boot(({ app }) => {
  posthog.init(ENV.POSTHOG_API_KEY as string, {
    api_host: ENV.POSTHOG_API_HOST,
  });
  app.provide('posthog', posthog);
});
