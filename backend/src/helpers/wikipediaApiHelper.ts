import axios from 'axios';
import logger from '../logger';

export default async function getArticleWikiText(title: string) {
  // Fetch the wikitext of the Wikipedia Article.
  // The article in Wikipedia
  // Original: https://en.wikipedia.org/
  const wpProxy = 'https://wikiless.tiekoetter.com';
  const wpArticleUrl = `${wpProxy}/w/api.php?action=query&formatversion=2&prop=revisions&rvprop=content&rvslots=%2A&titles=${title}&format=json`;
  const response = await axios.get(wpArticleUrl);

  // The article's wikitext of Wikipedia
  const wpArticleWikitext: string =
    response.data.query.pages[0].revisions[0].slots.main.content;
  logger.info('wikitext', { length: wpArticleWikitext.length });
  return wpArticleWikitext;
}
