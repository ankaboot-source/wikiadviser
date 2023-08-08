import axios from 'axios';
import logger from '../logger';
import { SearchResult } from '../types';
import WikipediaApiInterface from './wikipediaApiInterface';

export default class WikipediaApiClass implements WikipediaApiInterface {
  wpProxy = process.env.WIKIPEDIA_PROXY;

  wpProxyApi = axios.create({ baseURL: `${this.wpProxy}/w/api.php` });

  async getWikipediaArticleWikitext(title: string) {
    const wpLang = 'en';
    const response = await this.wpProxyApi.get('', {
      params: {
        action: 'query',
        format: 'json',
        formatversion: 2,
        prop: 'revisions',
        rvprop: 'content',
        rvslots: '*',
        titles: title,
        lang: wpLang
      }
    });

    // The article's wikitext of Wikipedia
    const wpArticleWikitext =
      response.data.query.pages[0].revisions[0].slots.main.content;

    logger.info('wikitext', { length: wpArticleWikitext.length });
    return wpArticleWikitext;
  }

  async getWikipediaArticles(term: string) {
    const wpLang = 'en';
    const response = await this.wpProxyApi.get('', {
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
        lang: wpLang
      }
    });

    const wpSearchedArticles = response.data?.query?.pages;
    const results: SearchResult[] = [];

    // Handling missing thumbnail's host condition
    if (wpSearchedArticles) {
      Object.keys(wpSearchedArticles).forEach((article) => {
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
      });
    } else return null;
    return results;
  }
}
