import axios from 'axios';

export default async function getArticleWikiText(title: string) {
  // Fetch the wikitext of the Wikipedia Article.
  // The article in Wikipedia
  const wpArticleUrl = `https://en.wikipedia.org/w/api.php?action=query&formatversion=2&prop=revisions&rvprop=content&rvslots=%2A&titles=${title}&format=json`;
  const response = await axios.get(wpArticleUrl);
  // The article's wikitext of Wikipedia
  const wpArticleWikitext: string =
    response.data.query.pages[0].revisions[0].slots.main.content;
  console.log('wikitext', wpArticleWikitext.length);
  return wpArticleWikitext;
}
