import { load } from 'cheerio';
import { encode } from 'html-entities';
import Parsoid from '../services/mediawikiAPI/ParsoidApi';
import { Change, ChildNodeData, TypeOfEditDictionary } from '../types';
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
      const elementInnerText = $element.prop('innerText')?.trim();
      if (!elementInnerText) {
        // If element is empty of innerText Destroy it
        $element.remove();
        return;
      }
      const diffAction: string = $element.data('diff-action') as string;
      let typeOfEdit: string = diffAction;
      const list: string[] = [];

      // Create the wrap element with the wanted metadata wrapElement
      const $wrapElement = CheerioAPI('<span>');
      let isComment = false;
      if ($element.find('.ve-ce-commentNode').length) {
        const $commentElement = CheerioAPI('<span>').text(elementInnerText);
        $wrapElement.append($commentElement);
        isComment = true;
        list.push(elementInnerText);
        $wrapElement.attr('data-content', elementInnerText);
        typeOfEdit = 'comment-insert';
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
            .replaceWith(function strikeThrough() {
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
        content: CheerioAPI.html($element),
        status: 0,
        description,
        type_of_edit: TypeOfEditDictionary[typeOfEdit],
        index: changeIndex,
        revision_id
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

function generateOuterMostSelectors(classes: string[]) {
  return classes
    .map((className) => `${className}:not(${className} *)`)
    .join(', ');
}

async function parseWikidataTemplate(
  pageContentXML: string,
  pageContentHTML: string,
  articleId: string,
  parsoidInstance: Parsoid
) {
  const newParsedContentXML = pageContentXML;
  const infoboxClasses = ['.infobox', '.infobox_v2', '.infobox_v3'];

  const wikidataTemplateRegex = /{{(Infobox|Taxobox)[\s\S]*?}}/;

  const hasInfoboxTemplate = wikidataTemplateRegex.test(newParsedContentXML);

  if (!hasInfoboxTemplate) {
    return newParsedContentXML;
  }

  const cheerioAPI = load(pageContentHTML);
  const infoboxes = cheerioAPI(generateOuterMostSelectors(infoboxClasses));
  const isWikidataTemplate = infoboxes
    .html()
    ?.toLowerCase()
    .includes('wikidata');

  if (!isWikidataTemplate) {
    return newParsedContentXML;
  }

  infoboxes.find('.wikidata-linkback, .navbar').remove();

  const promises = Array.from(infoboxes).map(async (infobox) => {
    const infoboxHtml = cheerioAPI.html(infobox);
    const wikiText = await parsoidInstance.ParsoidHtmlToWikitext(
      infoboxHtml,
      articleId
    );
    const parsedWikitext = wikiText
      .replace(/<style[^>]*>.*<\/style>/g, '')
      .replace(/\[\[.*\/wiki\/((File|Fichier):(.*?))\]\]/g, '[[$1]]') // Fix images
      .replace(/\[\[[^\]]*www\.wikidata\.org[^\]]*(?<!File:)\]\]/g, '') // remove wikidata redundant links
      .replace(/\[\[\/media\/wikipedia\/commons\/(?!.*File:)[^\]]*?\]\]/g, '')
      .replace(/\[\/wiki\/([^ \]]+)\s+([^\]]+)\]/g, '[[$1|$2]]'); // [wiki/article_name] => [[article_name]]

    return encode(parsedWikitext);
  });

  const parsedInfoboxes = await Promise.all(promises);

  const infoboxUpdatedContent = newParsedContentXML.replace(
    /{{(Infobox|Taxobox)[\s\S]*?}}/g,
    () => {
      const escapedInfobox = parsedInfoboxes.shift();
      if (escapedInfobox === undefined) {
        throw new Error('Failed to parse all wikidata template');
      }
      return escapedInfobox;
    }
  );
  return infoboxUpdatedContent;
}

function addSourceExternalLinks(pageContent: string, sourceLanguage: string) {
  return pageContent.replace(
    /\[\[(?!(?:File|Fichier))([^|\]]+)(?:\|([^|\]]*))?\]\]/g,
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
  updatedPageContent = addSourceExternalLinks(
    updatedPageContent,
    sourceLanguage
  );
  processedData =
    processedData.substring(0, pageStartIndex) +
    updatedPageContent +
    processedData.substring(pageEndIndex);

  return processedData;
}
