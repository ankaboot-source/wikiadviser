import { load } from 'cheerio';
import { encode } from 'html-entities';
import logger from '../logger';
import { Change, ChildNodeData, TypeOfEditDictionary } from '../types';
import { getArticle, getChanges } from './supabaseHelper';

function addPermissionDataToChanges(
  changesToInsert: Change[],
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

function unindexUnassignedChanges(changesToUpsert: Change[], changes: any) {
  for (const change of changes) {
    if (
      !changesToUpsert.some((changeToUpsert) => changeToUpsert.id === change.id)
    ) {
      const { index, users, comments, ...baseChange } = change;

      changesToUpsert.push({
        ...baseChange,
        index: null
      });
    }
  }
}

export async function refineArticleChanges(
  articleId: string,
  html: string,
  userId: string
) {
  const $ = load(html);
  let changeid = -1;
  // Loop through elements that have the attribute data-diff-action
  $("[data-diff-action]:not([data-diff-action='none'])").each(
    (index, element) => {
      const $element = $(element);
      const diffAction: string = $element.data('diff-action') as string;
      const list: string[] = [];

      // Create the wrap element with the wanted metadata wrapElement
      const $wrapElement = $('<span>');

      // Append a clone of the element to the wrap element
      $wrapElement.append($element.clone());

      let typeOfEdit: string = diffAction;

      // Wrapping related changes: Check if next node is an element (Not a text node)
      // AND if the current element has "change-remove" diff
      const node = $element[0].next as ChildNodeData | null;
      if (!node?.data?.trim() && diffAction === 'change-remove') {
        const $nextElement = $element.next();
        // Check if the next element has "change-insert" diff action
        if ($nextElement.data('diff-action') === 'change-insert') {
          // Append the next element to the wrap element
          $wrapElement.append($nextElement.clone());

          // change-remove is always succeeded by a change-insert
          typeOfEdit = 'change';
          const listItems = $('.ve-ui-diffElement-sidebar >')
            .children()
            .eq((changeid += 1))
            .children()
            .children();
          listItems.each((i, elem) => {
            list.push($(elem).text());
          });

          // Remove the last element
          $nextElement.remove();
        }
      }

      // Remove data-diff-id & data-parsoid Attributes
      $wrapElement.find('[data-diff-id]').each((_, el) => {
        $(el).removeAttr('data-diff-id');
      });
      $wrapElement.find('[data-parsoid]').each((_, el) => {
        $(el).removeAttr('data-parsoid');
      });

      // Add the description and the type of edit and update the element.
      $wrapElement.attr('data-description', list.join(' '));
      $wrapElement.attr('data-type-of-edit', typeOfEdit);

      $element.replaceWith($wrapElement);
    }
  );

  // Remove sidebar
  $('.ve-ui-diffElement-sidebar').remove();
  $('.ve-ui-diffElement-hasDescriptions').removeClass(
    've-ui-diffElement-hasDescriptions'
  );

  const changes = await getChanges(articleId);
  const changeElements = $('[data-description]');

  const changesToUpsert: Change[] = [];
  const changesToInsert: Change[] = [];
  let changeIndex = 0;

  for (const element of changeElements) {
    const $element = $(element);
    let changeId = '';
    let description: string | undefined;

    const typeOfEdit = $element.attr('data-type-of-edit') as
      | 'change'
      | 'insert'
      | 'remove';

    for (const change of changes) {
      const $changeContent = load(change.content, null, false);
      const changeContentInnerHTML = $changeContent('span:first').html();
      if (
        TypeOfEditDictionary[typeOfEdit] === change.type_of_edit &&
        $element.html() === changeContentInnerHTML
      ) {
        // Update the change INDEX
        changeId = change.id;
        const { index, user, comments, ...baseChange } = change;
        changesToUpsert.push({
          ...baseChange,
          index: changeIndex
        });
        changeIndex += 1;
        break;
      }
    }

    if (!changeId) {
      // Create new change
      description = $element.attr('data-description');
      changesToInsert.push({
        content: $.html($element),
        status: 0,
        description,
        type_of_edit: TypeOfEditDictionary[typeOfEdit],
        index: changeIndex
      });
      changeIndex += 1;
    }

    // Remove data-description & data-type-of-edit Attributes of the html content
    $element.removeAttr('data-description');
    $element.removeAttr('data-type-of-edit');
    $element.attr('data-id', '');
  }

  unindexUnassignedChanges(changesToUpsert, changes);

  // Add 'article_id' and 'contributor_id' properties to changeToinsert
  if (changesToInsert) {
    addPermissionDataToChanges(changesToInsert, articleId, userId);
    changesToUpsert.push(...changesToInsert);
  }

  const htmlContent = $.html();
  return { changesToUpsert, htmlContent };
}

export async function getArticleParsedContent(articleId: string) {
  const article = await getArticle(articleId);
  const changes = await getChanges(articleId);
  const content: string = article.current_html_content;
  if (content !== undefined && content !== null) {
    const $ = load(content);
    // Add more data
    $('[data-id]').each((index, element) => {
      const $element = $(element);
      $element.attr('data-type-of-edit', changes[index].type_of_edit);
      $element.attr('data-status', changes[index].status);
      $element.attr('data-index', changes[index].index);
      $element.attr('data-id', changes[index].id);
    });
    return $.html();
  }
  return null;
}

export async function getChangesAndParsedContent(articleId: string) {
  const changes = await getChanges(articleId);
  if (changes !== undefined && changes !== null) {
    for (const change of changes) {
      const $ = load(change.content);
      $('[data-id]').each((index, element) => {
        const $element = $(element);
        $element.attr('data-type-of-edit', change.type_of_edit);
        $element.attr('data-status', change.status);
      });
      change.content = $.html();
    }
    return changes;
  }
  return null;
}

function generateOuterMostSelectors(classes: string[]) {
  return classes
    .map((className) => `${className}:not(${className} *)`)
    .join(', ');
}

async function replaceWikiDataHtml(
  updatedPageContent: string,
  title: string,
  sourceLanguage: string,
  getWikipediaHTML: (title: string, language: string) => Promise<string>
) {
  if (/{{Infobox[\s\S]*?}}/.test(updatedPageContent)) {
    const articleXML = await getWikipediaHTML(title, sourceLanguage);
    const $ = load(articleXML);
    const infoboxClasses = ['.infobox', '.infobox_v2', '.infobox_v3'];
    const infoboxes = $(generateOuterMostSelectors(infoboxClasses));
    if (infoboxes.html()?.toLowerCase().includes('wikidata')) {
      // Remove unnecessary elements within the infobox
      infoboxes.find('.wikidata-linkback, .navbar').remove();
      // Replace image source within the infobox
      infoboxes
        .find('img')
        .attr('src', (_, src) =>
          src?.replace(/^\/media/, 'https://upload.wikimedia.org')
        );

      const infoboxesEscaped: string[] = [];
      for (const infobox of infoboxes) {
        const infoboxEscaped = encode(`<html>${$.html(infobox)}</html>`, {
          level: 'xml'
        });
        infoboxesEscaped.push(infoboxEscaped);
      }
      let somethingUnexpectedHappend = false;
      const infoboxUpdatedContent = updatedPageContent.replace(
        /{{Infobox[\s\S]*?}}/g,
        () => {
          const escapedInfobox = infoboxesEscaped.shift();
          if (!escapedInfobox) {
            somethingUnexpectedHappend = true;
            return '';
          }
          return escapedInfobox;
        }
      );
      if (!somethingUnexpectedHappend) {
        return infoboxUpdatedContent;
      }
      logger.error(
        `Unexpected error while processing infoboxes in article: ${title}`
      );
    }
  }
  return updatedPageContent;
}

function addSourceExternalLinks(pageContent: string, sourceLanguage: string) {
  return pageContent.replace(
    /\[\[(?!File:)([^|\]]+)(?:\|([^|\]]*))?\]\]/g,
    (_, page, preview) =>
      `[[wikipedia:${sourceLanguage}:${page}|${preview || page}]]`
  );
}
/**
 * Processes exported article data by adding missing tags and externalizing article sources to Wikipedia.
 * @param {string} exportData - The exported data of the article.
 * @returns {string} - The processed article data.
 */
export async function processExportedArticle(
  exportData: string,
  sourceLanguage: string,
  title: string,
  articleId: string,
  getWikipediaHTML: (title: string, language: string) => Promise<string>
): Promise<string> {
  // Add missing </base> into the file. (Exported files from proxies only)
  let processedData = exportData.replace(
    '\n    <generator>',
    '</base>\n    <generator>'
  );

  // Rename article
  processedData = processedData.replace(
    /<title>(.*?)<\/title>/s,
    `<title>${articleId}</title>`
  );

  // Externalize article sources to wikipedia
  const pageStartIndex = processedData.indexOf('<page>');
  const pageEndIndex = processedData.indexOf('</page>', pageStartIndex);
  const pageContent = processedData.substring(pageStartIndex, pageEndIndex);

  let updatedPageContent = addSourceExternalLinks(pageContent, sourceLanguage);
  updatedPageContent = await replaceWikiDataHtml(
    updatedPageContent,
    title,
    sourceLanguage,
    getWikipediaHTML
  );

  processedData =
    processedData.substring(0, pageStartIndex) +
    updatedPageContent +
    processedData.substring(pageEndIndex);

  return processedData;
}
