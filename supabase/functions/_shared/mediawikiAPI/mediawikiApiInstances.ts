import axios, { AxiosInstance } from "axios";
import https from "node:https";
import ENV from "../schema/env.schema.ts";

const mediawikiApiInstances = new Map<
  (typeof ENV.WIKIADVISER_LANGUAGES)[number],
  AxiosInstance
>();

for (const language of ENV.WIKIADVISER_LANGUAGES) {
  const axiosInstance = axios.create({
    baseURL: `${ENV.MEDIAWIKI_ENDPOINT}/${language}/api.php`,
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  });

  // Attach X-Wikiadviser-Key header to all requests
  axiosInstance.interceptors.request.use((config) => {
    config.headers = config.headers || {};
    config.headers["X-Wikiadviser-Key"] = ENV.WIKIADVISER_KEY;
    return config;
  });

  mediawikiApiInstances.set(language, axiosInstance);
}

export default mediawikiApiInstances;
