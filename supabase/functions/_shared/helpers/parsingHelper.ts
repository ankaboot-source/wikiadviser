import { load } from "npm:cheerio@1.0.0";
import Parsoid from "../mediawikiAPI/ParasoidApi.ts";
import { encode } from "npm:html-entities@2.6.0";
function fixSources(pageContent: string, sourceLanguage: string) {
  let updatedPageContent = addSourceExternalLinks(pageContent, sourceLanguage);
  updatedPageContent = addSourceTemplate(updatedPageContent, sourceLanguage);
  updatedPageContent = convertSourceTemplateToLink(
    updatedPageContent,
    sourceLanguage,
  );
  return updatedPageContent;
}
export function addSourceExternalLinks(
  pageContent: string,
  sourceLanguage: string,
) {
  return pageContent.replace(
    /\[\[(?!(?:File|Fichier))([^|\]]+)(?:\|([^|\]]*))?\]\]/g,
    (_, page, preview) =>
      `[[wikipedia:${sourceLanguage}:${page}|${preview || page}]]`,
  );
}
export function convertSourceTemplateToLink(
  pageContent: string,
  sourceLanguage: string,
) {
  return pageContent.replace(
    /{{Lnobr\|([\s\S]*?)}}/gi,
    (_, group) =>
      group.includes("|")
        ? `[[wikipedia:${sourceLanguage}:${group}]]`
        : `[[wikipedia:${sourceLanguage}:${group}|${group}]]`,
  );
}
export function addSourceTemplate(pageContent: string, sourceLanguage: string) {
  const pattern =
    /{{(Main|See also|Article (?:détaillé|général))\|((?:[^|}]+(?:\s*\|\s*[^|}]+)*)+)}}/g;

  return pageContent.replace(pattern, (_, templateType, articles) => {
    const parsedArticles = articles
      .split("|")
      .map((article: string, index: number) => {
        if (/^l\d+=/.test(article)) {
          return article.trim();
        }
        const label = `l${index + 1}=`;
        return `wikipedia:${sourceLanguage}:${article.trim()}${
          articles.includes(label) ? "" : `|${label}${article.trim()}`
        }`;
      });

    return `{{${templateType}|${parsedArticles.join("|")}}}`;
  });
}
function generateOuterMostSelectors(classes: string[]) {
  return classes
    .map((className) => `${className}:not(${className} *)`)
    .join(", ");
}
function extractInfoboxes(input: string) {
  const infoboxes = [];
  let count = 0;
  let start = -1;
  for (let i = 0; i < input.length; i += 1) {
    if (input[i] === "{" && input[i + 1] === "{") {
      if (count === 0) {
        start = i;
      }
      count += 1;
      i += 1; // skip next '{'
    } else if (input[i] === "}" && input[i + 1] === "}") {
      count -= 1;
      if (count === 0 && start !== -1) {
        const infobox = input.substring(start, i + 2);
        if (
          infobox.startsWith("{{Infobox") ||
          infobox.startsWith("{{Taxobox")
        ) {
          infoboxes.push(infobox);
        }
        start = -1;
      }
      i += 1; // skip next '}'
    }
  }
  return infoboxes;
}
async function parseWikidataTemplate(
  pageContentXML: string,
  pageContentHTML: string,
  articleId: string,
  parsoidInstance: Parsoid,
): Promise<string> {
  let newParsedContentXML = pageContentXML;
  const infoboxClasses = [".infobox", ".infobox_v2", ".infobox_v3"];

  const infoboxesWikitext = extractInfoboxes(newParsedContentXML);

  if (!infoboxesWikitext) {
    return newParsedContentXML;
  }

  const $CheerioAPI = load(pageContentHTML);
  const infoboxesHTML = $CheerioAPI(generateOuterMostSelectors(infoboxClasses));
  const isWikidataTemplate = infoboxesHTML
    .html()
    ?.toLowerCase()
    .includes("wikidata");

  if (!isWikidataTemplate) {
    return newParsedContentXML;
  }

  infoboxesHTML.find(".wikidata-linkback, .navbar").remove();

  const promises = Array.from(infoboxesHTML).map(async (infobox) => {
    const infoboxHtml = $CheerioAPI.html(infobox);
    const wikiText = await parsoidInstance.ParsoidHtmlToWikitext(
      infoboxHtml,
      articleId,
    );
    const parsedWikitext = wikiText
      .replace(/<style[^>]*>.*<\/style>/g, "")
      .replace(/\[\[.*(=|\/)((File|Fichier):(.*?))\]\]/g, "[[$2]]") // Replace image links to wikitext
      .replace(/(&lang=\w+)/g, "") // Remove '&lang=[value]' from wikipedia links
      .replace(/\[\[[^\]]*www\.wikidata\.org[^\]]*(?<!File:)\]\]/g, "") // Remove wikidata redundant links
      .replace(
        /\|-((?!(\|-))[\s\S])*\[\[\/media\/wikipedia\/commons\/(?!.*File:)[^\]]*?\]\]([\s\S]*?)(?=\n\|)/g,
        "",
      ) // Remove wikidata row (modify/icon) 👉 A wikitext table row start with | (if at the beginning) or |- and ends before the next |
      .replace(/\[\/wiki\/([^ \]]+)\s+([^\]]+)\]/g, "[[$1|$2]]"); // [wiki/article_name] => [[article_name]]
    return encode(parsedWikitext);
  });

  const parsedInfoboxes = await Promise.all(promises);
  for (const infobox of infoboxesWikitext) {
    if (infobox) {
      newParsedContentXML = newParsedContentXML.replace(infobox, () => {
        const escapedInfobox = parsedInfoboxes.shift();
        if (escapedInfobox === undefined) {
          throw new Error("Failed to parse all wikidata template");
        }
        return escapedInfobox;
      });
    }
  }
  return newParsedContentXML;
}
export async function processExportedArticle(
  pageContentXML: string,
  sourceLanguage: string,
  articleId: string,
  displayTitle: string,
  pageContentHTML: string,
): Promise<string> {
  // Add missing </base> into the file. (Exported files from proxies only)
  let processedData = pageContentXML.replace(
    "\n    <generator>",
    "</base>\n    <generator>",
  );

  // Rename article
  processedData = processedData.replace(
    /<title>(.*?)<\/title>/s,
    `<title>${articleId}</title>`,
  );

  // Insert DISPLAYTITLE
  processedData = processedData.replace(
    /<\/text>/s,
    `\n{{DISPLAYTITLE:${displayTitle}}}</text>`,
  );

  // Externalize article sources to wikipedia
  const pageStartIndex = processedData.indexOf("<page>");
  const pageEndIndex = processedData.indexOf("</page>", pageStartIndex);
  const pageContent = processedData.substring(pageStartIndex, pageEndIndex);

  let updatedPageContent = await parseWikidataTemplate(
    pageContent,
    pageContentHTML,
    articleId,
    new Parsoid(sourceLanguage),
  );
  updatedPageContent = fixSources(updatedPageContent, sourceLanguage);

  processedData = processedData.substring(0, pageStartIndex) +
    updatedPageContent +
    processedData.substring(pageEndIndex);

  return processedData;
}
