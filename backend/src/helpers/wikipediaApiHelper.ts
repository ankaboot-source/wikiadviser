import axios from 'axios';
import logger from '../logger';

export async function getWikipediaArticleWikitext(title: string) {
  // Fetch the wikitext of the Wikipedia Article.
  // The article in Wikipedia
  // Original: https://en.wikipedia.org/
  const wpProxy = process.env.WIKIPEDIA_PROXY;
  const wpLang = 'en';
  const wpArticleUrl = `${wpProxy}/w/api.php?action=query&formatversion=2&prop=revisions&rvprop=content&rvslots=%2A&titles=${title}&format=json&lang=${wpLang}`;
  const response = await axios.get(wpArticleUrl);

  // The article's wikitext of Wikipedia
  const wpArticleWikitext: string =
    response.data.query.pages[0].revisions[0].slots.main.content;
  logger.info('wikitext', { length: wpArticleWikitext.length });
  return wpArticleWikitext;
}

export async function getWikipediaArticles(term: string) {
  const wpProxy = process.env.WIKIPEDIA_PROXY;
  const wpLang = 'en';
  const wpSearchUrl = `${wpProxy}/w/api.php?action=query&format=json&generator=prefixsearch&prop=pageimages|description&ppprop=displaytitle&piprop=thumbnail&pithumbsize=60&pilimit=6&gpssearch=${term}&gpsnamespace=0&gpslimit=6&origin=*&lang=${wpLang}`;
  const response = await axios.get(wpSearchUrl);
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
