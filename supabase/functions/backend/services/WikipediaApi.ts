import { fetch } from "undici";
import { processExportedArticle } from "../helper/ParsingHelper.ts";
import { WikipediaSearchResult } from "../types/index.ts";
import { WikipediaInteractor } from "./WikipediaInteractor.ts";
import { ENV } from "../schema/env.schema.ts";
const WIKIPEDIA_PROXY = ENV.WIKIPEDIA_PROXY;

interface WikipediaApiResponse {
  query?: {
    pages?: {
      [key: string]: {
        title: string;
        description?: string;
        thumbnail?: { source: string };
      };
    };
  };
  parse?: {
    text: {
      "*": string;
    };
  };
}

export class WikipediaApi implements WikipediaInteractor {
  private static searchResultsLimit = 10;

  async getWikipediaArticles(
    term: string,
    language: string,
  ): Promise<WikipediaSearchResult[]> {
    const url =
      `${WIKIPEDIA_PROXY}/w/api.php?action=query&format=json&generator=prefixsearch&prop=pageimages|description&ppprop=displaytitle&piprop=thumbnail&pithumbsize=60&pilimit=${WikipediaApi.searchResultsLimit}&gpssearch=${term}&gpsnamespace=0&gpslimit=${WikipediaApi.searchResultsLimit}&origin=*&lang=${language}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const json: unknown = await response.json();

      const data = json as WikipediaApiResponse;

      const wpSearchedArticles = data?.query?.pages;
      const results: WikipediaSearchResult[] = [];

      if (wpSearchedArticles) {
        for (const article in wpSearchedArticles) {
          if (
            Object.prototype.hasOwnProperty.call(wpSearchedArticles, article) &&
            !wpSearchedArticles[article].title.includes(":")
          ) {
            const currentArticle = wpSearchedArticles[article];
            const {
              title,
              description,
              thumbnail: { source = "" } = {},
            } = currentArticle;

            let thumbnailSource = source;
            if (thumbnailSource.startsWith("/media")) {
              thumbnailSource = `${WIKIPEDIA_PROXY}${thumbnailSource}`;
            }

            results.push({
              title,
              description,
              thumbnail: thumbnailSource,
            });
          }
        }
      }
      return results;
    } catch (error) {
      console.error("Error in getWikipediaArticles:", error);
      return [];
    }
  }

  async getWikipediaHTML(title: string, language: string): Promise<string> {
    const url =
      `${WIKIPEDIA_PROXY}/w/api.php?action=parse&format=json&page=${title}&lang=${language}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const json: unknown = await response.json();

      const data = json as WikipediaApiResponse;

      const htmlString = data?.parse?.text["*"];
      if (!htmlString) {
        throw new Error("Could not get article HTML");
      }
      return htmlString;
    } catch (error) {
      console.error("Error in getWikipediaHTML:", error);
      return "";
    }
  }

  async exportArticleData(
    title: string,
    articleId: string,
    language: string,
  ): Promise<string> {
    const url =
      `${WIKIPEDIA_PROXY}/w/index.php?title=Special:Export&pages=${title}&templates=true&lang=${language}&curonly=true`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      let exportData = await response.text();

      exportData = await processExportedArticle(
        exportData,
        language,
        articleId,
        title,
        await this.getWikipediaHTML(title, language),
      );
      return exportData;
    } catch (error) {
      console.error("Error in exportArticleData:", error);
      throw error;
    }
  }
}
