import { load } from 'cheerio';
import {
  createNewChange,
  getArticle,
  getChanges,
  updateArticle,
  updateChange
} from './supabaseHelper';

export async function decomposeArticle(html: string, permissionId: string) {
  const $ = load(html);
  let changeid = -1;
  // Go through elements that have the attribute data-diff-action

  $("[data-diff-action]:not([data-diff-action='none'])").each(
    (index, element) => {
      const $element = $(element);
      const diffAction = $element.data('diff-action');
      const list: any[] = [];

      // Create the wrap element with the wanted metadatawrapElement
      const $wrapElement = $('<span>');

      // Append a clone of the element to the wrap element
      $wrapElement.append($element.clone());

      let typeOfEdit: any = diffAction;

      // Wrapping related changes: Check if next node is an element (Not a text node) AND if the current element has "change-remove" diff
      const node: any = $element[0].next;
      if (!node?.data?.trim() && diffAction === 'change-remove') {
        const $nextElement = $element.next();
        // Check if the next element has "change-insert" diff action
        if ($nextElement.data('diff-action') === 'change-insert') {
          // Append the next element to the wrap element
          $wrapElement.append($nextElement.clone());

          // change-remove is always succeeded by a change-insert
          typeOfEdit = 'change';
          // Add description attribute

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

  const elements = $('[data-description]');
  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index];
    const $element = $(element);
    // eslint-disable-next-line no-await-in-loop
    const changeId = await createNewChange(permissionId);
    $element.attr('data-id', changeId);
    const description = $element.attr('data-description');
    const typeOfEdit = $element.attr('data-type-of-edit') as
      | 'change'
      | 'insert'
      | 'remove';
    // Remove description and type of edit attr
    $element.removeAttr('data-description');
    $element.removeAttr('data-type-of-edit');
    const typeOfEditDictionary = {
      change: 0,
      insert: 1,
      remove: 2
    };
    // eslint-disable-next-line no-await-in-loop
    await updateChange(
      changeId,
      $.html($element),
      0,
      description,
      typeOfEditDictionary[typeOfEdit]
    );
  }
  await updateArticle(permissionId, $.html());
  return $.html();
}

export async function getArticleParsedContent(articleId: string) {
  const article = await getArticle(articleId);
  const changes = await getChanges(articleId);
  const content = article.current_html_content as string;
  const $ = load(content);
  // Add more data
  $('[data-id]').each((index, element) => {
    const $element = $(element);
    $element.attr('data-type-of-edit', changes[index].type_of_edit);
    $element.attr('data-status', changes[index].status);
  });
  return $.html();
}

export async function getChangesAndParsedContent(articleId: string) {
  const changes = (await getChanges(articleId)) as any;

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
