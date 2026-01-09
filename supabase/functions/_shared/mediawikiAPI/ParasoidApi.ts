import axios, { AxiosInstance } from "npm:axios@^1.8.4";
import mediawikiApiInstances from "./mediawikiApiInstances.ts";

export default class Parsoid {
  private readonly parsoidBaseAPI: AxiosInstance;

  /**
   * Constructs the Parsoid class instance.
   *
   * @param language - The language for which to build the Parsoid API.
   * @throws Error if no MediaWiki instance is found for the given language.
   */
  constructor(language: string) {
    this.parsoidBaseAPI = Parsoid.buildParsoidApi(language);
  }

  /**
   * Builds the Parsoid API based on the provided language.
   *
   * @param language - The language for which to build the Parsoid API.
   * @returns The constructed AxiosInstance for the Parsoid API.
   * @throws Error if no MediaWiki instance is found for the given language.
   */
  private static buildParsoidApi(language: string): AxiosInstance {
    const mediawikiApiInstance = mediawikiApiInstances.get(language);

    if (!mediawikiApiInstance) {
      throw new Error(`No MediaWiki instance found for language ${language}`);
    }

    const mediawikiBaseURL = mediawikiApiInstance.getUri();
    const domain = new URL(mediawikiBaseURL).hostname;

    return axios.create({
      baseURL: `https://${domain}/wiki/${language}/rest.php/${domain}`,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Converts HTML content to Wikitext using the Parsoid API.
   *
   * @param html - The HTML content to convert.
   * @param articleId - The ID of the article.
   * @returns The converted Wikitext.
   */
  async ParsoidHtmlToWikitext(
    html: string,
    articleId: string,
  ): Promise<string> {
    try {
      const response = await this.parsoidBaseAPI.post(
        `/v3/transform/html/to/wikitext/${articleId}`,
        { html },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      console.info(response);

      if (response.status !== 200) {
        const error = response.data.error ??
          `Error converting HTML to Wikitext: ${response.statusText}`;
        throw new Error(error);
      }
      return response.data;
    } catch (error) {
      throw new Error(`Error converting HTML to Wikitext: ${error}`);
    }
  }
}
