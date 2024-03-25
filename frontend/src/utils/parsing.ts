import { load } from 'cheerio';
import { ChangeItem, Tables } from 'src/types';

export function parseArticleHtml(
  content: string,
  changes: Tables<'changes'>[],
) {
  if (!content) {
    return null;
  }

  const CheerioAPI = load(content);
  CheerioAPI('[data-id]').each((index, element) => {
    if (!changes[index]) {
      return;
    }

    const $element = CheerioAPI(element);
    $element.attr('data-type-of-edit', String(changes[index].type_of_edit));
    $element.attr('data-status', String(changes[index].status));
    $element.attr('data-index', String(changes[index].index));
    $element.attr('data-id', changes[index].id);
  });
  return CheerioAPI.html();
}

export function parseChangeHtml(change: ChangeItem) {
  if (!change.content) {
    return change;
  }
  const CheerioAPI = load(change.content);
  CheerioAPI('[data-diff-action]').each((_, element) => {
    const $element = CheerioAPI(element);
    $element.attr('data-status', String(change.status));
  });

  return { ...change, content: CheerioAPI.html() };
}
