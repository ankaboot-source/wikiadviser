export interface ArticleSection {
  index: number;
  content: string;
  sectionTitle?: string;
}

const MIN_SECTION_CHARS = 200;
const MAX_SECTION_CHARS = 4000;

function combineSections(sections: ArticleSection[]): ArticleSection[] {
  if (sections.length === 0) return sections;

  const combined: ArticleSection[] = [];
  let currentBatch: ArticleSection[] = [sections[0]];
  let currentLength = sections[0].content.length;

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const wouldExceedMax =
      currentLength + section.content.length > MAX_SECTION_CHARS;
    const shouldCombine =
      section.content.length < MIN_SECTION_CHARS && !wouldExceedMax;

    if (shouldCombine) {
      currentBatch.push(section);
      currentLength += section.content.length;
    } else {
      combined.push({
        index: combined.length,
        content: currentBatch.map((s) => s.content).join('\n\n'),
        sectionTitle: currentBatch[0].sectionTitle,
      });
      currentBatch = [section];
      currentLength = section.content.length;
    }
  }

  if (currentBatch.length > 0) {
    combined.push({
      index: combined.length,
      content: currentBatch.map((s) => s.content).join('\n\n'),
      sectionTitle: currentBatch[0].sectionTitle,
    });
  }

  return combined;
}

function splitLargeSection(content: string, title?: string): ArticleSection[] {
  if (content.length <= MAX_SECTION_CHARS) {
    return [{ index: 0, content, sectionTitle: title }];
  }

  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());
  const chunks: ArticleSection[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const para of paragraphs) {
    if (
      currentLength + para.length > MAX_SECTION_CHARS &&
      currentChunk.length > 0
    ) {
      chunks.push({
        index: chunks.length,
        content: currentChunk.join('\n\n'),
        sectionTitle: title,
      });
      currentChunk = [para];
      currentLength = para.length;
    } else {
      currentChunk.push(para);
      currentLength += para.length;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push({
      index: chunks.length,
      content: currentChunk.join('\n\n'),
      sectionTitle: title,
    });
  }

  return chunks.length > 0
    ? chunks
    : [{ index: 0, content, sectionTitle: title }];
}

export function splitArticleIntoSections(wikitext: string): ArticleSection[] {
  const sections: ArticleSection[] = [];
  const lines = wikitext.split('\n');
  let currentSection: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^(=+)([^=]+)\1$/);

    if (headerMatch && currentSection.length > 0) {
      const content = currentSection.join('\n');
      const title = headerMatch[2].trim();

      const split = splitLargeSection(content, title);
      sections.push(...split);

      currentSection = [];
    }

    currentSection.push(line);
  }

  if (currentSection.length > 0) {
    const content = currentSection.join('\n');
    const split = splitLargeSection(content, undefined);
    sections.push(...split);
  }

  if (sections.length === 0) {
    const split = splitLargeSection(wikitext, undefined);
    sections.push(...split);
  }

  const combined = combineSections(sections);

  for (let i = 0; i < combined.length; i++) {
    combined[i].index = i;
  }

  console.log(
    `Sections: ${sections.length} initial → ${combined.length} final`,
  );

  return combined;
}
