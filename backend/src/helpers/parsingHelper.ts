/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
import { load } from 'cheerio';
import { Change, ChildNodeData } from '../types';
import {
  getArticle,
  getChanges,
  insertChanges,
  updateArticle,
  upsertChanges
} from './supabaseHelper';

export async function decomposeArticle(
  html: string,
  permissionId: string,
  articleId: string
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

      // Remove data-diff-if & data-parsoid Attributes
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

  /*
  1. Loop through HTML Changes:
    - If its in Table: Get changeID
    - If not: Create new change & Get changeID
    ++Index
  */
  const changes = await getChanges(articleId); // supabaseHelper.ts
  const elements = $('[data-description]');

  enum TypeOfEditDictionary {
    change = 0,
    insert = 1,
    remove = 2
  }
  const changesToUpsert: Change[] = [];
  const changesToInsert: Change[] = [];
  let changeIndex = 0;

  for (const element of elements) {
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
        const { index, users, comments, ...baseChange } = change;
        changesToUpsert.push({
          ...baseChange,
          index: changeIndex++
        });
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
        index: changeIndex++
      });
    }

    // Remove data-description & data-type-of-edit Attributes of the html content
    $element.removeAttr('data-description');
    $element.removeAttr('data-type-of-edit');
    $element.attr('data-id', '');
  }

  /*
  2. Loop through Table Changes:
  - If ID not in HTML Changes: set Index to null (unassigned)
  */
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

  // Bulk update & insert changes
  await upsertChanges(changesToUpsert); // supabaseHelper.ts
  await insertChanges(changesToInsert, permissionId); // supabaseHelper.ts

  await updateArticle(permissionId, $.html());
  return $.html();
}

export async function getArticleParsedContent(articleId: string) {
  const article = await getArticle(articleId); // supabaseHelper.ts
  const changes = await getChanges(articleId); // supabaseHelper.ts
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
  const changes = await getChanges(articleId); // supabaseHelper.ts
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
