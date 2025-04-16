import { WikipediaSearchResult } from "../_shared/types/index.ts";

export default interface WikipediaInteractor {
  getWikipediaArticles(
    term: string,
    language?: string,
  ): Promise<WikipediaSearchResult[]>;
}
