import axios, { AxiosInstance } from 'axios';
import logger from '../logger';
import { WikipediaSearchResult } from '../types';
import WikipediaInteractor from './WikipediaInteractor';

export default class WikipediaApiInteractor implements WikipediaInteractor {
  private wpProxy: string;

  private api: AxiosInstance;

  constructor() {
    this.wpProxy = process.env.WIKIPEDIA_PROXY!;
    this.api = axios.create({ baseURL: `${this.wpProxy}/w/api.php` });
  }

  private static wpLang: string = 'en';

  async getWikipediaArticleWikitext(title: string) {
    const response = await this.api.get('', {
      params: {
        action: 'query',
        format: 'json',
        formatversion: 2,
        prop: 'revisions',
        rvprop: 'content',
        rvslots: '*',
        titles: title,
        lang: WikipediaApiInteractor.wpLang
      }
    });

    const wpArticleWikitext =
      response.data.query.pages[0].revisions[0].slots.main.content;

    logger.info('wikitext', { length: wpArticleWikitext.length });
    return wpArticleWikitext;
  }

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
          if (
            wpSearchedArticles[article]?.thumbnail?.source?.startsWith('/media')
          ) {
            wpSearchedArticles[
              article
            ].thumbnail.source = `${this.wpProxy}${wpSearchedArticles[article]?.thumbnail?.source}`;
          }
          results.push({
            title: wpSearchedArticles[article].title,
            description: wpSearchedArticles[article].description,
            thumbnail: wpSearchedArticles[article].thumbnail?.source
          });
        }
      }
    }
    return results;
  }
}
