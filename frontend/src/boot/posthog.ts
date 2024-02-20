import posthog from 'posthog-js';
import { boot } from 'quasar/wrappers';

export default boot(({ app }) => {
  posthog.init(process.env.POSTHOG_API_KEY!, {
    api_host: process.env.POSTHOG_API_HOST,
  });
  app.provide('posthog', posthog);
});
