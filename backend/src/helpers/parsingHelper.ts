import { Cheerio, CheerioAPI, load } from 'cheerio';
import { encode } from 'html-entities';
import Parsoid from '../services/mediawikiAPI/ParsoidApi';
import { ChildNodeData, Tables, TypeOfEditDictionary } from '../types';
import { getChanges } from './supabaseHelper';

function addPermissionDataToChanges(
  changesToInsert: Tables<'changes'>[],
  articleId: string,
  userId: string
) {
  for (const change of changesToInsert) {
    if (!change.id) {
      change.article_id = articleId;
      change.contributor_id = userId;
    }
  }
}

function unindexUnassignedChanges(
  changesToUpsert: Tables<'changes'>[],
  changes: Tables<'changes'>[]
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
        revision_id: change.revision_id
      });
    }
  }
}

function createStrikethroughText(text: string) {
  return text
    .split('')
    .map((char) => `${char}\u0336`)
    .join('');
}

function handleComment(
  $wrapElement: Cheerio<any>, // skipcq: JS-0323
  elementInnerText: string,
  descriptionList: string[],
  $CheerioAPI: CheerioAPI
) {
  const typeOfEdit = 'comment-insert';
  $wrapElement.append($CheerioAPI('<span>').text(elementInnerText));
  $wrapElement.attr('title', elementInnerText);
  descriptionList.push(elementInnerText);
  return typeOfEdit;
}
export async function refineArticleChanges(
  articleId: string,
  html: string,
  userId: string,
  revision_id: string
) {
  const $CheerioAPI = load(html);
  let changeid = -1;
  // Loop through elements that have the attribute data-diff-action
  $CheerioAPI("[data-diff-action]:not([data-diff-action='none'])").each(
    (index, element) => {
      const $element = $CheerioAPI(element);
      const elementInnerText = $element.prop('innerText')?.trim();
      if (!elementInnerText && $element.get(0)?.tagName !== 'figure') {
        // If element is empty of innerText Destroy it And if its not a figure
        $element.remove();
        return;
      }
      const diffAction: string = $element.data('diff-action') as string;
      let typeOfEdit: string = diffAction;
      const descriptionList: string[] = [];

      // Create the wrap element with the wanted metadata wrapElement
      const $wrapElement = $CheerioAPI('<span>');

      const isComment = !!$element.find('.ve-ce-commentNode').length;
      if (isComment) {
        typeOfEdit = handleComment(
          $wrapElement,
          elementInnerText ?? '',
          descriptionList,
          $CheerioAPI
        );
      } else {
        // Append a clone of the element to the wrap element
        $wrapElement.append($element.clone());
      }

      // Wrapping related changes: Check if next node is an element (Not a text node)
      // AND if the current element has "change-remove" | "remove" diffAction
      const node = $element[0].next as ChildNodeData | null;
      if (
        !isComment &&
        !node?.data?.trim() &&
        (diffAction === 'change-remove' || diffAction === 'remove')
      ) {
        const $nextElement = $element.next();
        const nextTypeOfEdit = $nextElement.data('diff-action');
        // Check if the next element has "change-insert" | "insert" diff action

        if (nextTypeOfEdit === 'insert' || nextTypeOfEdit === 'change-insert') {
          // Append the next element to the wrap element
          $wrapElement.append($nextElement.clone());

          typeOfEdit = nextTypeOfEdit === 'insert' ? 'remove-insert' : 'change';

          if (nextTypeOfEdit === 'change-insert') {
            const descriptionListItems = $CheerioAPI(
              '.ve-ui-diffElement-sidebar >'
            )
              .children()
              .eq((changeid += 1))
              .children()
              .children();
            descriptionListItems.each((i, elem) => {
              descriptionList.push($CheerioAPI(elem).text());
            });
          }
          // Remove the last element
          $nextElement.remove();
        }
      }

      if (diffAction === 'structural-change') {
        typeOfEdit = 'structural-change';

        const descriptionListItems = $CheerioAPI('.ve-ui-diffElement-sidebar >')
          .children()
          .eq((changeid += 1))
          .children()
          .children();
        descriptionListItems.each((i, elem) => {
          let description = '';
          $CheerioAPI(elem)
            .find('del')
            .replaceWith(function strikeThrough() {
              return `${createStrikethroughText($CheerioAPI(this).text())} `; // E.g. <div><del>2017</del><ins>1999</ins></div> returns '2̶0̶1̶7̶ 1999'
            });

          $CheerioAPI(elem)
            .find('li')
            .each((ulElemIndex, ulElem) => {
              description = description.concat(
                `- ${$CheerioAPI(ulElem).text()}\n`
              );
            });

          description = description || $CheerioAPI(elem).text();

          descriptionList.push(description);
        });
      }

      // Remove data-diff-id & data-parsoid Attributes
      $wrapElement.find('[data-diff-id]').each((_, el) => {
        $CheerioAPI(el).removeAttr('data-diff-id');
      });
      $wrapElement.find('[data-parsoid]').each((_, el) => {
        $CheerioAPI(el).removeAttr('data-parsoid');
      });

      // Add the description and the type of edit and update the element.
      $wrapElement.attr('data-description', descriptionList.join('\n'));
      $wrapElement.attr('data-type-of-edit', typeOfEdit);

      $element.replaceWith($wrapElement);
    }
  );

  // Remove sidebar
  $CheerioAPI('.ve-ui-diffElement-sidebar').remove();
  $CheerioAPI('.ve-ui-diffElement-hasDescriptions').removeClass(
    've-ui-diffElement-hasDescriptions'
  );

  const changes = await getChanges(articleId);
  const changeElements = $CheerioAPI('[data-description]');

  const changesToUpsert: Tables<'changes'>[] = [];
  const changesToInsert: Tables<'changes'>[] = [];
  let changeIndex = 0;

  for (const element of changeElements) {
    const $element = $CheerioAPI(element);
    let changeId = '';
    let description: string | undefined;

    const typeOfEdit = $element.attr('data-type-of-edit') as
      | 'change'
      | 'insert'
      | 'remove'
      | 'remove-insert'
      | 'structural-change'
      | 'comment-insert';

    for (const change of changes) {
      const $changeContent = load(change.content, null, false);
      const changeContentInnerHTML = $changeContent('span:first').html();
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
          revision_id: change.revision_id
        });
        changeIndex += 1;
        break;
      }
    }

    if (!changeId) {
      // Create new change
      description = $element.attr('data-description');
      $element.removeAttr('data-description');
      changesToInsert.push({
        content: $CheerioAPI.html($element),
        status: 0,
        description: description as string,
        type_of_edit: TypeOfEditDictionary[typeOfEdit] as number,
        index: changeIndex,
        revision_id
      } as Tables<'changes'>);
      changeIndex += 1;
    }

    // Remove data-description & data-type-of-edit Attributes of the html content
    $element.removeAttr('data-description');
    $element.removeAttr('data-type-of-edit');
    $element.attr('data-id', '');
  }

  unindexUnassignedChanges(changesToUpsert, changes);

  // Add 'article_id', 'contributor_id' properties to changeToinsert
  if (changesToInsert) {
    addPermissionDataToChanges(changesToInsert, articleId, userId);
    changesToUpsert.push(...changesToInsert);
  }

  const htmlContent = $CheerioAPI.html();
  return { changesToUpsert, htmlContent };
}

function generateOuterMostSelectors(classes: string[]) {
  return classes
    .map((className) => `${className}:not(${className} *)`)
    .join(', ');
}

function extractInfoboxes(input: string) {
  const infoboxes = [];
  let count = 0;
  let start = -1;
  for (let i = 0; i < input.length; i += 1) {
    if (input[i] === '{' && input[i + 1] === '{') {
      if (count === 0) {
        start = i;
      }
      count += 1;
      i += 1; // skip next '{'
    } else if (input[i] === '}' && input[i + 1] === '}') {
      count -= 1;
      if (count === 0 && start !== -1) {
        const infobox = input.substring(start, i + 2);
        if (
          infobox.startsWith('{{Infobox') ||
          infobox.startsWith('{{Taxobox')
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

/**
 * Parses Wikidata template from XML and HTML content of a Wikipedia page.
 * @param pageContentXML - The XML content of the Wikipedia page.
 * @param pageContentHTML - The HTML content of the Wikipedia page.
 * @param articleId - The ID of the Wikipedia article.
 * @param parsoidInstance - The instance of Parsoid for parsing.
 * @returns The parsed Wikidata template.
 */
async function parseWikidataTemplate(
  pageContentXML: string,
  pageContentHTML: string,
  articleId: string,
  parsoidInstance: Parsoid
): Promise<string> {
  let newParsedContentXML = pageContentXML;
  const infoboxClasses = ['.infobox', '.infobox_v2', '.infobox_v3'];

  const infoboxesWikitext = extractInfoboxes(newParsedContentXML);

  if (!infoboxesWikitext) {
    return newParsedContentXML;
  }

  const $CheerioAPI = load(pageContentHTML);
  const infoboxesHTML = $CheerioAPI(generateOuterMostSelectors(infoboxClasses));
  const isWikidataTemplate = infoboxesHTML
    .html()
    ?.toLowerCase()
    .includes('wikidata');

  if (!isWikidataTemplate) {
    return newParsedContentXML;
  }

  infoboxesHTML.find('.wikidata-linkback, .navbar').remove();

  const promises = Array.from(infoboxesHTML).map(async (infobox) => {
    const infoboxHtml = $CheerioAPI.html(infobox);
    const wikiText = await parsoidInstance.ParsoidHtmlToWikitext(
      infoboxHtml,
      articleId
    );
    const parsedWikitext = wikiText
      .replace(/<style[^>]*>.*<\/style>/g, '')
      .replace(/\[\[.*(=|\/)((File|Fichier):(.*?))\]\]/g, '[[$2]]') // Replace image links to wikitext
      .replace(/(&lang=\w+)/g, '') // Remove '&lang=[value]' from wikipedia links
      .replace(/\[\[[^\]]*www\.wikidata\.org[^\]]*(?<!File:)\]\]/g, '') // Remove wikidata redundant links
      .replace(
        /\|-((?!(\|-))[\s\S])*\[\[\/media\/wikipedia\/commons\/(?!.*File:)[^\]]*?\]\]([\s\S]*?)(?=\n\|)/g,
        ''
      ) // Remove wikidata row (modify/icon) 👉 A wikitext table row start with | (if at the beginning) or |- and ends before the next |
      .replace(/\[\/wiki\/([^ \]]+)\s+([^\]]+)\]/g, '[[$1|$2]]'); // [wiki/article_name] => [[article_name]]
    return encode(parsedWikitext);
  });

  const parsedInfoboxes = await Promise.all(promises);
  for (const infobox of infoboxesWikitext) {
    if (infobox) {
      newParsedContentXML = newParsedContentXML.replace(infobox, () => {
        const escapedInfobox = parsedInfoboxes.shift();
        if (escapedInfobox === undefined) {
          throw new Error('Failed to parse all wikidata template');
        }
        return escapedInfobox;
      });
    }
  }
  return newParsedContentXML;
}

export function addSourceExternalLinks(
  pageContent: string,
  sourceLanguage: string
) {
  return pageContent.replace(
    /\[\[(?!(?:File|Fichier))([^|\]]+)(?:\|([^|\]]*))?\]\]/g,
    (_, page, preview) =>
      `[[wikipedia:${sourceLanguage}:${page}|${preview || page}]]`
  );
}

/**
 * Redirects MediaWiki articles to Wikipedia with the specified source language prefix.
 * This function modifies the following templates:
 *   - Main
 *   - See also
 *   - Article (détaillé, général)
 *
 * @param pageContent The content of the page containing templates.
 * @param sourceLanguage The source language prefix for Wikipedia articles.
 * @returns The updated page content with modified templates.
 */
export function addSourceTemplate(pageContent: string, sourceLanguage: string) {
  const pattern = /{{(Main|See also|Article (?:détaillé|général))\|([^}]+?)}}/g;

  return pageContent.replace(pattern, (_, templateType, articles) => {
    const parsedArticles = articles
      .split('|')
      .map((article: string, index: number) => {
        if (/^l\d+=/.test(article)) {
          return article.trim();
        }
        const label = `l${index + 1}=`;
        return `wikipedia:${sourceLanguage}:${article.trim()}${
          articles.includes(label) ? '' : `|${label}${article.trim()}`
        }`;
      });

    return `{{${templateType}|${parsedArticles.join('|')}}}`;
  });
}

/**
 * Converts certain templates to links.
 * This function modifies the following templates:
 *  - lnobr
 *
 * @param pageContent The content of the page containing templates.
 * @param sourceLanguage The source language prefix for Wikipedia articles.
 * @returns The updated page content with links instead of certain templates.
 */
export function convertSourceTemplateToLink(
  pageContent: string,
  sourceLanguage: string
) {
  return pageContent.replace(/{{Lnobr\|([\s\S]*?)}}/gi, (_, group) =>
    group.includes('|')
      ? `[[wikipedia:${sourceLanguage}:${group}]]`
      : `[[wikipedia:${sourceLanguage}:${group}|${group}]]`
  );
}

function fixSources(pageContent: string, sourceLanguage: string) {
  let updatedPageContent = addSourceExternalLinks(pageContent, sourceLanguage);
  updatedPageContent = addSourceTemplate(updatedPageContent, sourceLanguage);
  updatedPageContent = convertSourceTemplateToLink(
    updatedPageContent,
    sourceLanguage
  );
  return updatedPageContent;
}

/**
 * Processes exported article data by adding missing tags and externalizing article sources to Wikipedia.
 * @param {string} exportData - The exported data of the article.
 * @returns {string} - The processed article data.
 */
export async function processExportedArticle(
  pageContentXML: string,
  sourceLanguage: string,
  articleId: string,
  displayTitle: string,
  pageContentHTML: string
): Promise<string> {
  // Add missing </base> into the file. (Exported files from proxies only)
  let processedData = pageContentXML.replace(
    '\n    <generator>',
    '</base>\n    <generator>'
  );

  // Rename article
  processedData = processedData.replace(
    /<title>(.*?)<\/title>/s,
    `<title>${articleId}</title>`
  );

  // Insert DISPLAYTITLE
  processedData = processedData.replace(
    /<\/text>/s,
    `\n{{DISPLAYTITLE:${displayTitle}}}</text>`
  );

  // Externalize article sources to wikipedia
  const pageStartIndex = processedData.indexOf('<page>');
  const pageEndIndex = processedData.indexOf('</page>', pageStartIndex);
  const pageContent = processedData.substring(pageStartIndex, pageEndIndex);

  let updatedPageContent = await parseWikidataTemplate(
    pageContent,
    pageContentHTML,
    articleId,
    new Parsoid(sourceLanguage)
  );
  updatedPageContent = fixSources(updatedPageContent, sourceLanguage);

  processedData =
    processedData.substring(0, pageStartIndex) +
    updatedPageContent +
    processedData.substring(pageEndIndex);

  return processedData;
}
