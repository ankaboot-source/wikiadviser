import { load } from 'cheerio';
import { createNewChange, updateArticle, updateChange } from './supabaseHelper';

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
      // Delimiter <|> since it is unlikely to be present in any of the array elements
      $wrapElement.attr('data-description', list.join('<|>'));
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
    const typeOfEditDictionary = {
      change: 0,
      insert: 1,
      remove: 2
    };

    // ! STORE the whole $.html($element) Content
    // eslint-disable-next-line no-await-in-loop
    await updateChange(
      changeId,
      $.html($element),
      0,
      description,
      typeOfEditDictionary[typeOfEdit]
    );

    // Remove description and type of edit attr
    $element.removeAttr('data-description');
    $element.removeAttr('data-type-of-edit');

    console.log(
      changeId,
      $.html($element).toString(),
      0,
      description,
      typeOfEdit,
      typeOfEditDictionary[typeOfEdit]
    );
  }
  await updateArticle(permissionId, $.html());
  return $.html(); //! insert this content into Articles.
}

export function renderArticle() {}

export function ref(html: string, permissionId: string) {
  let id = 0;
  let changeid = -1; // post change > return change Id, add it as an attr
  const userId = 'User1'; // find username using permissiodId
  const date = new Date().toLocaleString('fr'); // useless
  console.log(permissionId);
  const $ = load(html);

  // Go through elements that have the attribute data-diff-action
  $("[data-diff-action]:not([data-diff-action='none'])").each(
    (index, element) => {
      const $element = $(element);
      const diffAction = $element.data('diff-action');

      // Create the wrap element with the wanted metadata
      const $wrapElement = $('<span>');
      $wrapElement.attr('data-status', 'Awaiting Reviewer Approval');
      $wrapElement.attr('data-description', '');

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
          const list: any[] = [];
          const listItems = $('.ve-ui-diffElement-sidebar >')
            .children()
            .eq((changeid += 1))
            .children()
            .children();
          listItems.each((i, elem) => {
            list.push($(elem).text());
          });

          // Delimiter <|> since it is unlikely to be present in any of the array elements
          $wrapElement.attr('data-description', list.join('<|>'));

          // Remove the last element
          $nextElement.remove();
        }
      }
      $wrapElement.attr('data-type-of-edit', typeOfEdit);
      $element.replaceWith($wrapElement);
    }
  );

  // Remove sidebar
  $('.ve-ui-diffElement-sidebar').remove();
  $('.ve-ui-diffElement-hasDescriptions').removeClass(
    've-ui-diffElement-hasDescriptions'
  );

  // Add more data
  $('[data-status]').each((index, element) => {
    const $element = $(element);
    $element.attr('data-id', `${(id += 1)}`);
    $element.attr('data-user', userId);
    $element.attr('data-date', date);
  });
  return $.html();
}

/*
  const elements = $('[data-status]');
  const promises = elements.map(async (index, element) => {
    const id = await createNewChange(permissionId);
    const $element = $(element);
    $element.attr('data-id', id);
    $element.attr('data-user', username);
  });
  */
