import axios, { AxiosInstance } from 'axios';
import { WikipediaSearchResult } from '../types';
import WikipediaInteractor from './WikipediaInteractor';

export default class WikipediaApiInteractor implements WikipediaInteractor {
  private wpProxy: string;

  private api: AxiosInstance;

  constructor() {
    this.wpProxy = process.env.WIKIPEDIA_PROXY!;
    this.api = axios.create({ baseURL: `${this.wpProxy}/w/api.php` });
  }

  private static wpLang = 'en';

  async getWikipediaArticles(term: string) {
    const response = await this.api.get('', {
      params: {
        action: 'query',
        format: 'json',
        generator: 'prefixsearch',
        prop: 'pageimages|description',
        ppprop: 'displaytitle',
        piprop: 'thumbnail',
        pithumbsize: 60,
        pilimit: 6,
        gpssearch: term,
        gpsnamespace: 0,
        gpslimit: 6,
        origin: '*',
        lang: WikipediaApiInteractor.wpLang
      }
    });

    const wpSearchedArticles = response.data?.query?.pages;
    const results: WikipediaSearchResult[] = [];

    // Handling missing thumbnail's host condition
    if (wpSearchedArticles) {
      for (const article in wpSearchedArticles) {
        if (Object.prototype.hasOwnProperty.call(wpSearchedArticles, article)) {
          const currentArticle = wpSearchedArticles[article];
          const {
            title,
            description,
            thumbnail: { source = '' } = {}
          } = currentArticle;

          let thumbnailSource = source;
          if (thumbnailSource.startsWith('/media')) {
            thumbnailSource = `${this.wpProxy}${thumbnailSource}`;
          }

          results.push({
            title,
            description,
            thumbnail: thumbnailSource
          });
        }
      }
    }
    return results;
  }
}
