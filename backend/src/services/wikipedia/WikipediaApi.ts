import axios, { AxiosInstance } from 'axios';
import { WikipediaSearchResult } from '../../types';
import WikipediaInteractor from './WikipediaInteractor';
import { processExportedArticle } from '../../helpers/parsingHelper';

export class WikipediaApi implements WikipediaInteractor {
  private wpProxy: string;

  private api: AxiosInstance;

  constructor() {
    this.wpProxy = process.env.WIKIPEDIA_PROXY!;
    this.api = axios.create({ baseURL: `${this.wpProxy}/w/api.php` });
  }

  private static searchResultsLimit = 10;

  async getWikipediaArticles(term: string, language: string) {
    const response = await this.api.get('', {
      params: {
        action: 'query',
        format: 'json',
        generator: 'prefixsearch',
        prop: 'pageimages|description',
        ppprop: 'displaytitle',
        piprop: 'thumbnail',
        pithumbsize: 60,
        pilimit: WikipediaApi.searchResultsLimit,
        gpssearch: term,
        gpsnamespace: 0,
        gpslimit: WikipediaApi.searchResultsLimit,
        origin: '*',
        lang: language
      }
    });

    const wpSearchedArticles = response.data?.query?.pages;
    const results: WikipediaSearchResult[] = [];

    // Handling missing thumbnail's host condition
    if (wpSearchedArticles) {
      for (const article in wpSearchedArticles) {
        if (Object.prototype.hasOwnProperty.call(wpSearchedArticles, article)) {
          const currentArticle = wpSearchedArticles[article];
          const {
            title,
            description,
            thumbnail: { source = '' } = {}
          } = currentArticle;

          let thumbnailSource = source;
          if (thumbnailSource.startsWith('/media')) {
            thumbnailSource = `${this.wpProxy}${thumbnailSource}`;
          }

          results.push({
            title,
            description,
            thumbnail: thumbnailSource
          });
        }
      }
    }
    return results;
  }

  async getWikipediaHTML(title: string, language: string) {
    const response = await this.api.get('', {
      params: {
        action: 'parse',
        format: 'json',
        page: title,
        lang: language
      }
    });
    const htmlString = response.data.parse.text['*'];
    if (!htmlString) {
      throw Error('Could not get article HTML');
    }
    return htmlString;
  }

  async exportArticleData(
    title: string,
    articleId: string,
    language: string
  ): Promise<string> {
    const exportResponse = await axios.get(`${this.wpProxy}/w/index.php`, {
      params: {
        title: 'Special:Export',
        pages: title,
        templates: true,
        lang: language,
        curonly: true
      },
      responseType: 'stream'
    });

    return new Promise<string>((resolve, reject) => {
      let exportData = '';
      exportResponse.data.on('data', (chunk: string) => {
        exportData += chunk;
      });

      exportResponse.data.on('end', async () => {
        exportData = await processExportedArticle(
          exportData,
          language,
          title,
          articleId,
          this.getWikipediaHTML.bind(this)
        );
        resolve(exportData);
      });

      exportResponse.data.on('error', (error: Error) => {
        reject(error);
      });
    });
  }
}

const wikipediaApi = new WikipediaApi();
export default wikipediaApi;
