import { WikipediaSearchResult } from '../types';

export default interface WikipediaInteractor {
  getWikipediaArticles(
    term: string,
    language?: 'en'
  ): Promise<WikipediaSearchResult[]>;
}
