import { wikiadviserLanguages } from 'src/data/wikiadviserLanguages';

export function getDefaultUserLanguage() {
  const language = wikiadviserLanguages.find(
    (item) => window.navigator.language.split('-')[0] === item.lang,
  );
  return language ?? wikiadviserLanguages[0];
}
