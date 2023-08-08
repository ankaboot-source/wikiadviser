import { WikipediaSearchResult } from '../types';

export default interface WikipediaInteractor {
  getWikipediaArticleWikitext(title: string): Promise<string>;
  getWikipediaArticles(term: string): Promise<WikipediaSearchResult[]>;
}
