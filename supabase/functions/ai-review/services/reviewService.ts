import MediawikiClient from '../../_shared/mediawikiAPI/MediawikiClient.ts';
import wikipediaApi from '../../_shared/wikipedia/WikipediaApi.ts';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildEmptyArticlePrompt,
  cleanAIResponse,
  extractDisplayTitle,
} from '../config/prompts.ts';
import { generateRevisionSummary, reviewArticleSection } from './aiService.ts';
import { splitArticleIntoSections } from './articleProcessor.ts';
import type { LLMConfig } from '../utils/types.ts';
import { getArticle } from '../../_shared/helpers/supabaseHelper.ts';

export interface ReviewResult {
  hasImprovements: boolean;
  comment: string;
  oldRevisionId: number;
  newRevisionId: number;
}

const BATCH_SIZE = 3;

const noImprovement = (comment: string): ReviewResult => ({
  hasImprovements: false,
  comment,
  oldRevisionId: 0,
  newRevisionId: 0,
});

function safeReplace(
  text: string,
  oldContent: string,
  newContent: string,
): string {
  const index = text.indexOf(oldContent);

  if (index === -1) {
    console.warn('Could not find content to replace');
    return text;
  }

  return (
    text.substring(0, index) +
    newContent +
    text.substring(index + oldContent.length)
  );
}

async function generateEmptyArticleContent(
  article: { title: string | null; description: string | null },
  config: LLMConfig,
  customInstructions: string,
  existingWikitext: string,
): Promise<string | null> {
  try {
    const generated = await reviewArticleSection(
      config.apiKey,
      config.model,
      buildEmptyArticlePrompt(article),
      `USER INSTRUCTION: ${customInstructions}\n\nGenerate content for this article:`,
    );

    const content = generated?.trim();
    if (!content || content.length < 50) return null;

    const displayTitle = extractDisplayTitle(existingWikitext);
    return displayTitle ? `${displayTitle}\n${content}` : content;
  } catch (error) {
    console.error('Error generating content for empty article:', error);
    return null;
  }
}

async function buildImprovedWikitext(
  wikitext: string,
  config: LLMConfig,
  systemPrompt: string,
): Promise<{ improvedWikitext: string; improvedSections: number }> {
  const sections = splitArticleIntoSections(wikitext);
  const replacements: Array<{ original: string; improved: string }> = [];

  for (let i = 0; i < sections.length; i += BATCH_SIZE) {
    const batch = sections.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (section, batchIdx) => {
        const idx = i + batchIdx;
        console.log(
          `Processing ${idx + 1}/${sections.length}: ${section.content.length} chars`,
        );

        try {
          const rawResponse = await reviewArticleSection(
            config.apiKey,
            config.model,
            systemPrompt,
            buildUserPrompt(section.content),
          );

          const improvedContent = cleanAIResponse(rawResponse, section.content);
          if (
            improvedContent.trim() &&
            improvedContent.trim() !== section.content.trim()
          ) {
            console.log(`Section ${idx + 1}/${sections.length}: improved`);
            return { original: section.content, improved: improvedContent };
          }

          console.log(`Section ${idx + 1}/${sections.length}: unchanged`);
          return null;
        } catch (error) {
          console.error(
            `Section ${idx + 1} failed:`,
            error instanceof Error ? error.message : error,
          );
          return null;
        }
      }),
    );

    for (const result of results) {
      if (result) replacements.push(result);
    }
  }

  const improvedWikitext = replacements.reduce(
    (text, { original, improved }) => safeReplace(text, original, improved),
    wikitext,
  );

  console.log(
    `Complete: ${replacements.length}/${sections.length} sections improved`,
  );
  return { improvedWikitext, improvedSections: replacements.length };
}

function hasRealContent(wikitext: string): boolean {
  const stripped = wikitext
    .replaceAll(/\{\{DISPLAYTITLE:[^}]*\}\}/gi, '')
    .replaceAll(/\{\{[^}]*\}\}/g, '')
    .trim();
  return stripped.length > 0;
}
export async function reviewAndImproveArticle(
  articleId: string,
  language: string,
  config: LLMConfig,
  miraBotId: string,
  customInstructions?: string,
): Promise<ReviewResult> {
  const mediawiki = new MediawikiClient(language, wikipediaApi);
  const [articleData, article] = await Promise.all([
    mediawiki.getArticleForAIReview(articleId),
    getArticle(articleId),
  ]);

  const wikitext = articleData.wikitext ?? '';
  const isEmpty = !hasRealContent(wikitext);

  let improvedWikitext: string;
  let improvedSections: number;

  if (isEmpty) {
    if (!customInstructions?.trim())
      return noImprovement(
        'Article has no content. Add a custom prompt to generate content.',
      );
    if (!article.title?.trim())
      return noImprovement('Article has no title — cannot generate content');

    const generated = await generateEmptyArticleContent(
      article,
      config,
      customInstructions,
      wikitext,
    );
    if (!generated)
      return noImprovement('Generated content was too short or empty');

    improvedWikitext = generated;
    improvedSections = 1;
  } else {
    console.log(`Article: ${article.title}, ${wikitext.length} chars`);
    const systemPrompt = buildSystemPrompt(
      article.title,
      article.description,
      config.prompt,
      customInstructions,
    );
    ({ improvedWikitext, improvedSections } = await buildImprovedWikitext(
      wikitext,
      config,
      systemPrompt,
    ));
  }

  if (improvedSections === 0 || improvedWikitext.trim() === wikitext.trim()) {
    return noImprovement(
      improvedSections === 0 ? 'No improvements needed' : 'No changes detected',
    );
  }

  const summaryPhrase = await generateRevisionSummary(
    config.apiKey,
    config.model,
    wikitext,
    improvedWikitext,
  );
  const editResult = await mediawiki.editArticleAsBot(
    articleId,
    improvedWikitext,
    `Mira: ${summaryPhrase}`,
  );

  return {
    hasImprovements: true,
    comment: 'Changes applied',
    oldRevisionId: editResult.oldrevid,
    newRevisionId: editResult.newrevid,
  };
}
