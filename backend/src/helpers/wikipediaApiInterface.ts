import { SearchResult } from '../types';

export default interface WikipediaApiInterface {
  getWikipediaArticleWikitext(title: string): Promise<string>;
  getWikipediaArticles(term: string): Promise<SearchResult[] | null>;
}
