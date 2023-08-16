import { WikipediaSearchResult } from '../types';

export default interface WikipediaInteractor {
  getWikipediaArticles(term: string): Promise<WikipediaSearchResult[]>;
}
