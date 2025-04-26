import axios, { AxiosInstance } from "axios";
import https from "node:https";
import ENV from "../_shared/schema/env.schema.ts";

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

  mediawikiApiInstances.set(language, axiosInstance);
}

export default mediawikiApiInstances;
