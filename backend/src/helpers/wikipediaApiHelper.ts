import axios from 'axios';
import logger from '../logger';

const wpProxy = process.env.WIKIPEDIA_PROXY;
const wpProxyApi = axios.create({ baseURL: `${wpProxy}/w/api.php` });

export async function getWikipediaArticleWikitext(title: string) {
  const wpLang = 'en';
  const response = await wpProxyApi.get('', {
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

export async function getWikipediaArticles(term: string) {
  const wpLang = 'en';
  const response = await wpProxyApi.get('', {
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

  // Handling missing thumbnail's host condition
  Object.keys(wpSearchedArticles).forEach((article) => {
    if (wpSearchedArticles[article]?.thumbnail?.source?.startsWith('/media')) {
      wpSearchedArticles[
        article
      ].thumbnail.source = `${wpProxy}${wpSearchedArticles[article]?.thumbnail?.source}`;
    }
  });

  return wpSearchedArticles;
}
