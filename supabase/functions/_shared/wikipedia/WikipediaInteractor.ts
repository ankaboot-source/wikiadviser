import { WikipediaSearchResult } from "../types/index.ts";

export default interface WikipediaInteractor {
  getWikipediaArticles(
    term: string,
    language?: string,
  ): Promise<WikipediaSearchResult[]>;
}
