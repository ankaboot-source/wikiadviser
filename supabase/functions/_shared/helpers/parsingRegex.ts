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
    group.includes("|")
      ? `[[wikipedia:${sourceLanguage}:${group}]]`
      : `[[wikipedia:${sourceLanguage}:${group}|${group}]]`
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
  });
}
