import { load } from 'cheerio';
import { encode } from 'html-entities';
import logger from '../logger';
import { Article, Change, ChildNodeData, TypeOfEditDictionary } from '../types';
import { getChanges } from './supabaseHelper';

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
      changesToUpsert.push({
        index: null,
        id: change.id,
        status: change.status,
        content: change.content,
        article_id: change.article_id,
        created_at: change.created_at,
        description: change.description,
        type_of_edit: change.type_of_edit,
        contributor_id: change.contributor_id,
        revision_id: change.revision_id,
        section: change.section
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

export async function refineArticleChanges(
  articleId: string,
  html: string,
  userId: string,
  revision_id: string
) {
  const CheerioAPI = load(html);
  let changeid = -1;
  // Loop through elements that have the attribute data-diff-action
  CheerioAPI("[data-diff-action]:not([data-diff-action='none'])").each(
    (index, element) => {
      const $element = CheerioAPI(element);
      if (!$element.prop('innerText')?.trim()) {
        $element.remove();
        return;
      } // If element is empty of innerText Destroy it
      const diffAction: string = $element.data('diff-action') as string;
      const list: string[] = [];

      // Create the wrap element with the wanted metadata wrapElement
      const $wrapElement = CheerioAPI('<span>');

      // Append a clone of the element to the wrap element
      $wrapElement.append($element.clone());

      let typeOfEdit: string = diffAction;

      // Wrapping related changes: Check if next node is an element (Not a text node)
      // AND if the current element has "change-remove" | 'remove' diffAction
      const node = $element[0].next as ChildNodeData | null;
      if (
        !node?.data?.trim() &&
        (diffAction === 'change-remove' || diffAction === 'remove')
      ) {
        const $nextElement = $element.next();
        // Check if the next element has "change-insert" diff action
        if (
          $nextElement.data('diff-action') === 'change-insert' ||
          $nextElement.data('diff-action') === 'insert'
        ) {
          // Append the next element to the wrap element
          $wrapElement.append($nextElement.clone());
          typeOfEdit = 'remove-insert';
          if ($nextElement.data('diff-action') === 'change-insert') {
            // change-remove is always succeeded by a change-insert
            typeOfEdit = 'change';
            const listItems = CheerioAPI('.ve-ui-diffElement-sidebar >')
              .children()
              .eq((changeid += 1))
              .children()
              .children();
            listItems.each((i, elem) => {
              list.push(CheerioAPI(elem).text());
            });
          }

          // Remove the last element
          $nextElement.remove();
        }
      }

      if (diffAction === 'structural-change') {
        typeOfEdit = 'structural-change';

        const listItems = CheerioAPI('.ve-ui-diffElement-sidebar >')
          .children()
          .eq((changeid += 1))
          .children()
          .children();
        listItems.each((i, elem) => {
          let description = '';
          CheerioAPI(elem)
            .find('del')
            .replaceWith(function () {
              return `${createStrikethroughText(CheerioAPI(this).text())} `; // E.g. <div><del>2017</del><ins>1999</ins></div> returns '2̶0̶1̶7̶ 1999'
            });

          CheerioAPI(elem)
            .find('li')
            .each((ulElemIndex, ulElem) => {
              description = description.concat(
                `- ${CheerioAPI(ulElem).text()}\n`
              );
            });

          description = description || CheerioAPI(elem).text();

          list.push(description);
        });
      }

      const section = $element.closest('p').attr('id');

      // Remove data-diff-id & data-parsoid Attributes
      $wrapElement.find('[data-diff-id]').each((_, el) => {
        CheerioAPI(el).removeAttr('data-diff-id');
      });
      $wrapElement.find('[data-parsoid]').each((_, el) => {
        CheerioAPI(el).removeAttr('data-parsoid');
      });

      // Add the description and the type of edit and update the element.
      $wrapElement.attr('data-description', list.join('\n'));
      $wrapElement.attr('data-type-of-edit', typeOfEdit);
      $wrapElement.attr('data-section', section);

      $element.replaceWith($wrapElement);
    }
  );

  // Remove sidebar
  CheerioAPI('.ve-ui-diffElement-sidebar').remove();
  CheerioAPI('.ve-ui-diffElement-hasDescriptions').removeClass(
    've-ui-diffElement-hasDescriptions'
  );

  const changes = await getChanges(articleId);
  const changeElements = CheerioAPI('[data-description]');

  const changesToUpsert: Change[] = [];
  const changesToInsert: Change[] = [];
  let changeIndex = 0;

  for (const element of changeElements) {
    const $element = CheerioAPI(element);
    let changeId = '';
    let description: string | undefined;

    const typeOfEdit = $element.attr('data-type-of-edit') as
      | 'change'
      | 'insert'
      | 'remove'
      | 'remove-insert'
      | 'structural-change';
    const section = $element.attr('data-section');

    for (const change of changes) {
      const $changeContent = load(change.content, null, false);
      const changeContentInnerHTML = $changeContent('span:first').html();
      if (
        TypeOfEditDictionary[typeOfEdit] === change.type_of_edit &&
        $element.html() === changeContentInnerHTML &&
        section === change.section
      ) {
        // Update the change INDEX
        changeId = change.id;

        changesToUpsert.push({
          id: change.id,
          index: changeIndex,
          status: change.status,
          content: change.content,
          article_id: change.article_id,
          created_at: change.created_at,
          description: change.description,
          type_of_edit: change.type_of_edit,
          contributor_id: change.contributor_id,
          revision_id: change.revision_id,
          section: change.section
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
        content: CheerioAPI.html($element),
        status: 0,
        description,
        type_of_edit: TypeOfEditDictionary[typeOfEdit],
        index: changeIndex,
        revision_id,
        section
      });
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

  const htmlContent = CheerioAPI.html();
  return { changesToUpsert, htmlContent };
}

export function parseArticle(article: Article, changes: Change[]) {
  const content = article.current_html_content;

  if (!content) {
    return null;
  }

  const CheerioAPI = load(content);
  CheerioAPI('[data-id]').each((index, element) => {
    // Add more data
    const $element = CheerioAPI(element);
    $element.attr('data-type-of-edit', String(changes[index].type_of_edit));
    $element.attr('data-status', String(changes[index].status));
    $element.attr('data-index', String(changes[index].index));
    $element.attr('data-id', changes[index].id);
    $element.attr('data-section', changes[index].section);
  });
  return CheerioAPI.html();
}

export function parseChanges(changes: Change[]) {
  const parsedChanges = changes.map((change) => {
    if (change.content) {
      const CheerioAPI = load(change.content);
      CheerioAPI('[data-diff-action]').each((_, element) => {
        const $element = CheerioAPI(element);
        $element.attr('data-status', String(change.status));
      });
      const modifiedContent = CheerioAPI.html();
      return {
        ...change,
        content: modifiedContent
      };
    }
    return change;
  });
  return parsedChanges;
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
  if (/{{(Infobox|Taxobox)[\s\S]*?}}/.test(updatedPageContent)) {
    const articleXML = await getWikipediaHTML(title, sourceLanguage);
    const CheerioAPI = load(articleXML);
    const infoboxClasses = ['.infobox', '.infobox_v2', '.infobox_v3'];
    const infoboxes = CheerioAPI(generateOuterMostSelectors(infoboxClasses));
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
        const infoboxEscaped = encode(
          `<html>${CheerioAPI.html(infobox)}</html>`,
          {
            level: 'xml'
          }
        );
        infoboxesEscaped.push(infoboxEscaped);
      }
      let somethingUnexpectedHappend = false;
      const infoboxUpdatedContent = updatedPageContent.replace(
        /{{(Infobox|Taxobox)[\s\S]*?}}/g,
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
