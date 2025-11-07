import axios, { AxiosRequestConfig } from "axios";
import { processExportedArticle } from "../helpers/parsingHelper.ts";
import ENV from "../schema/env.schema.ts";
import { WikipediaSearchResult } from "../types/index.ts";
import WikipediaInteractor from "./WikipediaInteractor.ts";

export class WikipediaApi implements WikipediaInteractor {
  private wpProxy = ENV.WIKIPEDIA_PROXY;

  constructor() {
    axios.interceptors.request.use((config: AxiosRequestConfig) => {
      console.info(
        "Request URL:",
        `${config.baseURL || ""}${config.url}?${
          new URLSearchParams(config.params).toString()
        }`,
      );
      return config;
    });
  }

  private static searchResultsLimit = 10;

  getDomain(language: string): string {
    return this.wpProxy
      ? `${this.wpProxy}`
      : `https://${language}.wikipedia.org`;
  }

  async getWikipediaArticles(term: string, language: string) {
    const domain = this.getDomain(language);
    const response = await axios.get(
      `${domain}/w/api.php`,
      {
        params: {
          action: "query",
          format: "json",
          generator: "prefixsearch",
          prop: "pageimages|description|pageprops",
          ppprop: "displaytitle",
          piprop: "thumbnail",
          pithumbsize: 60,
          pilimit: WikipediaApi.searchResultsLimit,
          gpssearch: term,
          gpsnamespace: 0,
          gpslimit: WikipediaApi.searchResultsLimit,
          origin: "*",
          ...(this.wpProxy && { lang: language }),
        },
        headers: {
          "User-Agent": "MyCoolTool/1.0 (https://MyCoolTool.com/contact)",
        },
      },
    );

    const wpSearchedArticles = response.data?.query?.pages;
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

    const response = await axios.get(
      `${domain}/w/api.php`,
      {
        params: {
          action: "parse",
          format: "json",
          page: title,
          ...(this.wpProxy && { lang: language }),
        },
      },
    );
    const htmlString = response.data.parse.text["*"];
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

    const exportResponse = await axios.get(
      `${domain}/w/index.php`,
      {
        params: {
          title: "Special:Export",
          pages: title,
          templates: true,
          curonly: true,
          ...(this.wpProxy && { lang: language }),
        },
        responseType: "stream",
      },
    );

    return new Promise<string>((resolve, reject) => {
      let exportData = "";
      exportResponse.data.on("data", (chunk: string) => {
        exportData += chunk;
      });

      exportResponse.data.on("end", async () => {
        exportData = await processExportedArticle(
          exportData,
          language,
          articleId,
          title,
          await this.getWikipediaHTML(title, language),
        );
        resolve(exportData);
      });

      exportResponse.data.on("error", (error: Error) => {
        reject(error);
      });
    });
  }
}

const wikipediaApi = new WikipediaApi();
export default wikipediaApi;
