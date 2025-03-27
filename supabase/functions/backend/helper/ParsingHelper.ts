import { Cheerio, CheerioAPI, Element, load } from "cheerio";
import { encode } from "html-entities";
import Parsoid from "../services/mediawikiAPI/ParsoidApi";
import { Tables, TypeOfEditDictionary } from "../types/index.ts";
import { getChanges } from "./supabaseHelper.ts";

function addPermissionDataToChanges(
  changesToInsert: Tables<"changes">[],
  articleId: string,
  userId: string,
) {
  for (const change of changesToInsert) {
    if (!change.id) {
      change.article_id = articleId;
      change.contributor_id = userId;
    }
  }
}

function unindexUnassignedChanges(
  changesToUpsert: Tables<"changes">[],
  changes: Tables<"changes">[],
) {
  for (const change of changes) {
    if (
      !changesToUpsert.some((changeToUpsert) => changeToUpsert.id === change.id)
    ) {
      changesToUpsert.push({
        index: null,
        archived: change.archived,
        hidden: change.hidden,
        id: change.id,
        status: change.status,
        content: change.content,
        article_id: change.article_id,
        created_at: change.created_at,
        description: change.description,
        type_of_edit: change.type_of_edit,
        contributor_id: change.contributor_id,
        revision_id: change.revision_id,
      });
    }
  }
}

function createStrikethroughText(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += text[i] + "\u0336";
  }
  return result;
}

function handleComment(
  $wrapElement: Cheerio<Element>,
  elementInnerText: string,
  descriptionList: string[],
  $CheerioAPI: CheerioAPI,
) {
  const typeOfEdit = "comment-insert";
  $wrapElement.append($CheerioAPI("<span>").text(elementInnerText));
  $wrapElement.attr("title", elementInnerText);
  descriptionList.push(elementInnerText);
  return typeOfEdit;
}

function generateOuterMostSelectors(classes: string[]): string {
  return classes
    .map((className) => `${className}:not(${className} *)`)
    .join(", ");
}

function extractInfoboxes(input: string): string[] {
  const infoboxes: string[] = [];
  let count = 0;
  let start = -1;
  for (let i = 0; i < input.length; i++) {
    if (input[i] === "{" && input[i + 1] === "{") {
      if (count === 0) {
        start = i;
      }
      count++;
      i++; // skip next '{'
    } else if (input[i] === "}" && input[i + 1] === "}") {
      count--;
      if (count === 0 && start !== -1) {
        const infobox = input.substring(start, i + 2);
        if (
          infobox.startsWith("{{Infobox") || infobox.startsWith("{{Taxobox")
        ) {
          infoboxes.push(infobox);
        }
        start = -1;
      }
      i++;
    }
  }
  return infoboxes;
}

interface RefineArticleChangesResult {
  changesToUpsert: Tables<"changes">[];
  htmlContent: string;
}

export async function refineArticleChanges(
  articleId: string,
  html: string,
  userId: string,
  revision_id: string,
): Promise<RefineArticleChangesResult> {
  try {
    const $CheerioAPI = load(html);
    let changeid = -1;

    const extractDescriptionList = (): string[] => {
      const descriptionList: string[] = [];
      const descriptionListItems = $CheerioAPI(".ve-ui-diffElement-sidebar >")
        .children()
        .eq(changeid += 1)
        .children()
        .children();
      descriptionListItems.each((_i: number, elem: Element) => {
        let description = "";
        $CheerioAPI(elem)
          .find("del")
          .replaceWith(function (this: Cheerio<Element>) { // Added type for this
            return `${createStrikethroughText($CheerioAPI(this).text())} `;
          });

        $CheerioAPI(elem)
          .find("li")
          .each((_ulElemIndex: number, ulElem: Element) => { //Marked ulElemIndex as unused
            description = description.concat(
              `- ${$CheerioAPI(ulElem).text()}\n`,
            );
          });

        description = description || $CheerioAPI(elem).text();
        descriptionList.push(description);
      });
      return descriptionList;
    };

    // Cache selectors for performance
    const diffElements = "[data-diff-action]:not([data-diff-action='none'])";
    const veCeCommentNode = ".ve-ce-commentNode";
    // deno-lint-ignore no-unused-vars
    const descriptionSidebar = ".ve-ui-diffElement-sidebar >";
    const hasDescriptionsClass = "ve-ui-diffElement-hasDescriptions";
    // deno-lint-ignore no-unused-vars
    const diffIdSelector = "[data-diff-id]";
    // deno-lint-ignore no-unused-vars
    const parsoidSelector = "[data-parsoid]";
    const changeContentSelector = "span:first";

    // Loop through elements that have the attribute data-diff-action
    $CheerioAPI(diffElements).each((_index: number, element: Element) => {
      const $element = $CheerioAPI(element);
      const elementInnerText = $element.prop("innerText")?.trim();
      const tagName = $element.get(0)?.tagName;

      if (!elementInnerText && tagName !== "figure") {
        // If element is empty of innerText and not a figure, remove it
        $element.remove();
        return;
      }

      const diffAction: string = $element.data("diff-action") as string;
      let typeOfEdit: string = diffAction;
      let descriptionList: string[] = []; // Initialize here

      // Pre-extract attributes and content to minimize DOM interaction.

      const isComment = !!$element.find(veCeCommentNode).length;
      let wrapElementContent: string;

      if (isComment) {
        typeOfEdit = handleComment(
          $CheerioAPI("<span>"), // Create a new element instead of using $wrapElement
          elementInnerText ?? "",
          descriptionList,
          $CheerioAPI,
        );
        wrapElementContent = `<span>${encode(elementInnerText ?? "")}</span>`;
      } else {
        wrapElementContent = $element.clone().toString(); // Get the HTML string
      }

      // Handle related changes in the next element
      let nextElementContent = "";
      const $nextElement = $element.next();

      if ($nextElement.length) {
        const nextTypeOfEdit = $nextElement.data("diff-action");
        if (nextTypeOfEdit === "insert" || nextTypeOfEdit === "change-insert") {
          nextElementContent = $nextElement.clone().toString();
          wrapElementContent += nextElementContent; // Concatenate directly

          typeOfEdit = nextTypeOfEdit === "insert" ? "remove-insert" : "change";
          if (nextTypeOfEdit === "change-insert") {
            descriptionList = extractDescriptionList();
          }
          $nextElement.remove(); // Remove next element after processing
        }
      }

      if (diffAction === "structural-change") {
        typeOfEdit = "structural-change";
        descriptionList = extractDescriptionList();
      }

      // Construct the wrap element as a string to reduce DOM manipulation
      const description = descriptionList.join("\n");
      const wrapElement = `<span data-description="${
        encode(description)
      }" data-type-of-edit="${
        encode(typeOfEdit)
      }">${wrapElementContent}</span>`;

      // Replace the current element with the constructed wrap element
      $element.replaceWith(wrapElement);
    });

    // Remove sidebar and classes (Chained operations can be more efficient)
    $CheerioAPI(".ve-ui-diffElement-sidebar").remove();
    $CheerioAPI(".ve-ui-diffElement-hasDescriptions").removeClass(
      hasDescriptionsClass,
    );

    const changes = await getChanges(articleId); // Supabase call
    const changeElements = $CheerioAPI("[data-description]");

    const changesToUpsert: Tables<"changes">[] = [];
    const changesToInsert: Tables<"changes">[] = [];
    let changeIndex = 0;

    for (const element of changeElements) {
      const $element = $CheerioAPI(element);
      let changeId = "";
      let description: string | undefined;

      const typeOfEdit = $element.attr("data-type-of-edit") as
        | "change"
        | "insert"
        | "remove"
        | "remove-insert"
        | "structural-change"
        | "comment-insert";

      for (const change of changes) {
        const $changeContent = load(change.content, null, false);
        const changeContentInnerHTML = $changeContent(changeContentSelector)
          .html();
        if (
          TypeOfEditDictionary[typeOfEdit] === change.type_of_edit &&
          $element.html() === changeContentInnerHTML
        ) {
          // Update the change INDEX
          changeId = change.id;

          changesToUpsert.push({
            id: change.id,
            archived: change.archived,
            hidden: change.hidden,
            index: changeIndex,
            status: change.status,
            content: change.content,
            article_id: change.article_id,
            created_at: change.created_at,
            description: change.description,
            type_of_edit: change.type_of_edit,
            contributor_id: change.contributor_id,
            revision_id: change.revision_id,
          });
          changeIndex += 1;
          break;
        }
      }

      if (!changeId) {
        // Create new change
        description = $element.attr("data-description");
        $element.removeAttr("data-description");
        changesToInsert.push({
          content: $CheerioAPI.html($element),
          status: 0,
          description: description as string,
          type_of_edit: TypeOfEditDictionary[typeOfEdit] as number,
          index: changeIndex,
          revision_id,
        } as Tables<"changes">);
        changeIndex += 1;
      }

      // Remove data-description & data-type-of-edit Attributes of the html content (Chained operations)
      $element.removeAttr("data-description").removeAttr("data-type-of-edit")
        .attr("data-id", "");
    }

    unindexUnassignedChanges(changesToUpsert, changes);

    // Add 'article_id', 'contributor_id' properties to changeToinsert
    if (changesToInsert) {
      addPermissionDataToChanges(changesToInsert, articleId, userId);
      changesToUpsert.push(...changesToInsert);
    }

    const htmlContent = $CheerioAPI.html();
    return { changesToUpsert, htmlContent };
  } catch (error) {
    console.error("Error in refineArticleChanges: ", error);
    throw error; // Re-throw to be handled by the Hono route
  }
}

export async function processExportedArticle(
  pageContentXML: string,
  sourceLanguage: string,
  articleId: string,
  displayTitle: string,
  pageContentHTML: string,
): Promise<string> {
  try {
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
  } catch (error) {
    console.error("Error in processExportedArticle: ", error);
    throw error; // Re-throw for Hono to handle
  }
}

/**
 * Parses Wikidata template from XML and HTML content of a Wikipedia page.
 */
async function parseWikidataTemplate(
  pageContentXML: string,
  pageContentHTML: string,
  articleId: string,
  parsoidInstance: Parsoid,
): Promise<string> {
  try {
    let newParsedContentXML = pageContentXML;
    const infoboxClasses = [".infobox", ".infobox_v2", ".infobox_v3"];

    const infoboxesWikitext = extractInfoboxes(newParsedContentXML);

    if (!infoboxesWikitext) {
      return newParsedContentXML;
    }

    const $CheerioAPI = load(pageContentHTML);
    const infoboxesHTML = $CheerioAPI(
      generateOuterMostSelectors(infoboxClasses),
    );
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
  } catch (error) {
    console.error("Error in parseWikidataTemplate: ", error);
    throw error;
  }
}

function fixSources(pageContent: string, sourceLanguage: string): string {
  let updatedPageContent = addSourceExternalLinks(pageContent, sourceLanguage);
  updatedPageContent = addSourceTemplate(updatedPageContent, sourceLanguage);
  updatedPageContent = convertSourceTemplateToLink(
    updatedPageContent,
    sourceLanguage,
  );
  return updatedPageContent;
}

function addSourceExternalLinks(
  pageContent: string,
  sourceLanguage: string,
): string {
  return pageContent.replace(
    /\[\[(?!(?:File|Fichier))([^|\]]+)(?:\|([^|\]]*))?\]\]/g,
    (_: string, page: string, preview: string) =>
      `[[wikipedia:${sourceLanguage}:${page}|${preview || page}]]`,
  );
}

function addSourceTemplate(
  pageContent: string,
  sourceLanguage: string,
): string {
  const pattern =
    /{{(Main|See also|Article (?:détaillé|général))\|((?:[^|}]+(?:\s*\|\s*[^|}]+)*)+)}}/g;

  return pageContent.replace(
    pattern,
    (_: string, templateType: string, articles: string) => {
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
    },
  );
}

function convertSourceTemplateToLink(
  pageContent: string,
  sourceLanguage: string,
): string {
  return pageContent.replace(
    /{{Lnobr\|([\s\S]*?)}}/gi,
    (_: string, group: string) =>
      group.includes("|")
        ? `[[wikipedia:${sourceLanguage}:${group}]]`
        : `[[wikipedia:${sourceLanguage}:${group}|${group}]]`,
  );
}
