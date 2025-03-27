import { WikipediaSearchResult } from "../types/index.ts";

export interface WikipediaInteractor {
  getWikipediaArticles(
    term: string,
    language?: string,
  ): Promise<WikipediaSearchResult[]>;
}
