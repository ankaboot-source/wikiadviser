import axios, { AxiosInstance } from "axios";
import { WikipediaSearchResult } from "../_shared/types/index.ts";
import WikipediaInteractor from "./WikipediaInteractor.ts";
import ENV from "./env.schema.ts";
export class WikipediaApi implements WikipediaInteractor {
  private wpProxy: string;

  private api: AxiosInstance;

  constructor() {
    this.wpProxy = ENV.WIKIPEDIA_PROXY;
    this.api = axios.create({ baseURL: `${this.wpProxy}/w/api.php` });
  }

  private static searchResultsLimit = 10;

  async getWikipediaArticles(term: string, language: string) {
    const response = await this.api.get("", {
      params: {
        action: "query",
        format: "json",
        generator: "prefixsearch",
        prop: "pageimages|description",
        ppprop: "displaytitle",
        piprop: "thumbnail",
        pithumbsize: 60,
        pilimit: WikipediaApi.searchResultsLimit,
        gpssearch: term,
        gpsnamespace: 0,
        gpslimit: WikipediaApi.searchResultsLimit,
        origin: "*",
        lang: language,
      },
    });

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
            thumbnailSource = `${this.wpProxy}${thumbnailSource}`;
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
}

const wikipediaApi = new WikipediaApi();
export default wikipediaApi;
