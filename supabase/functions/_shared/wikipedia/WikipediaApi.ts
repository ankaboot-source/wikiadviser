import { processExportedArticle } from "../helpers/parsingHelper.ts";
import ENV from "../schema/env.schema.ts";
import { WikipediaSearchResult } from "../types/index.ts";
import WikipediaInteractor from "./WikipediaInteractor.ts";

const USER_AGENT = "WikiAdviser/1.0 (ops@ankaboot.io)";
export class WikipediaApi implements WikipediaInteractor {
  private wpProxy = ENV.WIKIPEDIA_PROXY;
  private userAgent = USER_AGENT;
  private static searchResultsLimit = 10;

  private get headers() {
    return {
      "User-Agent": this.userAgent,
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

    const url = `${domain}/w/api.php?${params.toString()}`;
    console.info("Request URL:", url);
    const response = await fetch(url, { headers: this.headers });
    console.info(JSON.stringify(response));
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

    const url = `${domain}/w/api.php?${params.toString()}`;
    console.info("Request URL:", url);
    const response = await fetch(url, { headers: this.headers });
    const data = await response.json();
    const htmlString = data?.parse?.text?.["*"];
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
    try {
      console.info('exportArticleData');
      const domain = this.getDomain(language);
      console.log('domain', domain)

      const params = new URLSearchParams({
        title: "Special:Export",
        pages: title,
        templates: "true",
        curonly: "true",
        ...(this.wpProxy && { lang: language }),
      });
      console.log('params', params)
      const url = `${domain}/w/index.php?${params.toString()}`;
      console.info("Request exportArticleData URL:", url);
      const exportResponse = await fetch(url, { headers: this.headers });
      console.info(exportResponse);
      const exportData = await exportResponse.text();

      const processedData = await processExportedArticle(
        exportData,
        language,
        articleId,
        title,
        await this.getWikipediaHTML(title, language),
      );

      return processedData;
    } catch (error) {
      console.error(error)
      throw error;
    }
  }
}

const wikipediaApi = new WikipediaApi();
export default wikipediaApi;
