import { processExportedArticle } from "../helpers/parsingHelper.ts";
import ENV from "../schema/env.schema.ts";
import { WikipediaSearchResult } from "../types/index.ts";
import WikipediaInteractor from "./WikipediaInteractor.ts";

const USER_AGENT = "WikiAdviser/1.0 (ops@ankaboot.io)";
export class WikipediaApi implements WikipediaInteractor {
  private wpProxy = ENV.WIKIPEDIA_PROXY;
  private static searchResultsLimit = 10;

  constructor() {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (input: RequestInfo | URL, initial?: RequestInit) => {
      const headers = {
        "User-Agent": USER_AGENT,
        ...(initial?.headers || {}),
      };

      console.info("Request URL:", input.toString());

      return originalFetch(input, {
        ...initial,
        headers,
      });
    };
  }

  getDomain(language: string): string {
    return this.wpProxy
      ? `${this.wpProxy}`
      : `https://${language}.wikipedia.org`;
  }

  async getWikipediaArticles(term: string, language: string) {
    const domain = this.getDomain(language);

    const params = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "prefixsearch",
      prop: "pageimages|description|pageprops",
      ppprop: "displaytitle",
      piprop: "thumbnail",
      pithumbsize: "60",
      pilimit: String(WikipediaApi.searchResultsLimit),
      gpssearch: term,
      gpsnamespace: "0",
      gpslimit: String(WikipediaApi.searchResultsLimit),
      origin: "*",
      ...(this.wpProxy && { lang: language }),
    });

    console.info("Request URL:", `${domain}/w/api.php?${params.toString()}`);
    const response = await fetch(`${domain}/w/api.php?${params.toString()}`);
    const data = await response.json();
    const wpSearchedArticles = data?.query?.pages;
    const results: WikipediaSearchResult[] = [];

    // Hide utility pages (Having ":") & Handling missing thumbnail's host condition
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
            const domain = this.getDomain(language);
            thumbnailSource = `${domain}${thumbnailSource}`;
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
  }

  async getWikipediaHTML(title: string, language: string) {
    const domain = this.getDomain(language);

    const params = new URLSearchParams({
      action: "parse",
      format: "json",
      page: title,
      ...(this.wpProxy && { lang: language }),
    });

    console.info("Request URL:", `${domain}/w/api.php?${params.toString()}`);
    const response = await fetch(`${domain}/w/api.php?${params.toString()}`);
    const data = await response.json();
    const htmlString = data.parse.text["*"];
    if (!htmlString) {
      throw Error("Could not get article HTML");
    }
    return htmlString;
  }

  async exportArticleData(
    title: string,
    articleId: string,
    language: string,
  ): Promise<string> {
    const domain = this.getDomain(language);

    const params = new URLSearchParams({
      title: "Special:Export",
      pages: title,
      templates: "true",
      curonly: "true",
      ...(this.wpProxy && { lang: language }),
    });

    console.info("Request URL:", `${domain}/w/index.php?${params.toString()}`);
    const exportResponse = await fetch(
      `${domain}/w/index.php?${params.toString()}`,
    );
    const exportData = await exportResponse.text();

    const processedData = await processExportedArticle(
      exportData,
      language,
      articleId,
      title,
      await this.getWikipediaHTML(title, language),
    );

    return processedData;
  }
}

const wikipediaApi = new WikipediaApi();
export default wikipediaApi;
