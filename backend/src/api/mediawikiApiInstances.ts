import axios, { AxiosInstance } from 'axios';
import https from 'https';

const wikiadviserLanguages = JSON.parse(process.env.WIKIADVISER_LANGUAGES!);
const mediawikiApiInstances = new Map<
  (typeof wikiadviserLanguages)[number],
  AxiosInstance
>();

for (const language of wikiadviserLanguages) {
  const axiosInstance = axios.create({
    baseURL: `${process.env.MEDIAWIKI_ENDPOINT}/${language}/api.php`,
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });

  mediawikiApiInstances.set(language, axiosInstance);
}

export default mediawikiApiInstances;
