export interface ChangedSection {
  header: string;
  content: string;
}

/**
 * Splits a whole-article review response into header+content blocks.
 * The model is asked to return ONLY the sections it changed, each prefixed
 * with its exact section header (e.g. "== History ==").
 */
export function parseChangedSections(response: string): ChangedSection[] {
  const sections: ChangedSection[] = [];
  const lines = response.split('\n');
  let currentHeader: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^(=+)([^=]+)\1$/);
    if (headerMatch) {
      if (currentHeader) {
        sections.push({
          header: currentHeader,
          content: currentContent.join('\n').trimEnd(),
        });
      }
      currentHeader = headerMatch[2].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentHeader) {
    sections.push({
      header: currentHeader,
      content: currentContent.join('\n').trimEnd(),
    });
  }

  return sections;
}

/**
 * Finds the section in the wikitext that starts with the given header title
 * and ends at the next header of the same or higher level. Returns the full
 * section text (header line + content), or null if the header is not found.
 */
export function findSectionByHeader(
  wikitext: string,
  headerTitle: string,
): string | null {
  const lines = wikitext.split('\n');
  const headerRegex = /^(=+)([^=]+)\1$/;
  let startIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(headerRegex);
    if (m && m[2].trim() === headerTitle) {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) return null;

  const level = lines[startIdx].match(/^(=+)/)![1].length;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(headerRegex);
    if (m && m[1].length <= level) {
      endIdx = i;
      break;
    }
  }

  return lines.slice(startIdx, endIdx).join('\n');
}

/**
 * Applies changed sections back onto the wikitext. Each section's original
 * header line is preserved exactly; only the content is replaced. Sections
 * whose content is unchanged are skipped.
 */
export function applyChangedSections(
  wikitext: string,
  sections: ChangedSection[],
): { improvedWikitext: string; replaced: number } {
  let improvedWikitext = wikitext;
  let replaced = 0;

  for (const section of sections) {
    const originalSection = findSectionByHeader(
      improvedWikitext,
      section.header,
    );
    if (!originalSection) continue;

    const headerLine = originalSection.split('\n')[0];
    const newSection = `${headerLine}\n${section.content}`;
    if (newSection.trim() === originalSection.trim()) continue;

    improvedWikitext = improvedWikitext.replace(originalSection, newSection);
    replaced++;
  }

  return { improvedWikitext, replaced };
}