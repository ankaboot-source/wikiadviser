import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { env } from '../schema/env.schema';

const wikiadviserLanguages = JSON.parse(env.WIKIADVISER_LANGUAGES) as string[];
const mediawikiApiInstances = new Map<
  (typeof wikiadviserLanguages)[number],
  AxiosInstance
>();

for (const language of wikiadviserLanguages) {
  const axiosInstance = axios.create({
    baseURL: `${env.MEDIAWIKI_ENDPOINT}/${language}/api.php`,
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });

  mediawikiApiInstances.set(language, axiosInstance);
}

export default mediawikiApiInstances;
