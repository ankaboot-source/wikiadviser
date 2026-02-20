import MediawikiClient from '../../_shared/mediawikiAPI/MediawikiClient.ts';
import wikipediaApi from '../../_shared/wikipedia/WikipediaApi.ts';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildEmptyArticlePrompt,
  cleanAIResponse,
} from '../config/prompts.ts';
import { reviewArticleSection } from './aiService.ts';
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

export async function reviewAndImproveArticle(
  articleId: string,
  language: string,
  config: LLMConfig,
  miraBotId: string,
  customInstructions?: string,
): Promise<ReviewResult> {
  const mediawiki = new MediawikiClient(language, wikipediaApi);

  const articleData = await mediawiki.getArticleForAIReview(articleId);
  const article = await getArticle(articleId);

  const wikitext = articleData.wikitext;
  const isEmptyArticle = !wikitext || wikitext.trim().length === 0;

  if (isEmptyArticle) {
    if (!customInstructions?.trim()) {
      return {
        hasImprovements: false,
        comment:
          'Article has no content. Add a custom prompt to generate content.',
        oldRevisionId: 0,
        newRevisionId: 0,
      };
    }

    if (!article.title?.trim()) {
      return {
        hasImprovements: false,
        comment: 'Article has no title — cannot generate content',
        oldRevisionId: 0,
        newRevisionId: 0,
      };
    }

    try {
      const generated = await reviewArticleSection(
        config.apiKey,
        config.model,
        buildEmptyArticlePrompt(article),
        `USER INSTRUCTION: ${customInstructions}\n\nGenerate content for this article:`,
      );

      const content = generated?.trim();
      if (!content || content.length < 50) {
        return {
          hasImprovements: false,
          comment: 'Generated content was too short or empty',
          oldRevisionId: 0,
          newRevisionId: 0,
        };
      }

      const editResult = await mediawiki.editArticleAsBot(
        articleId,
        content,
        'Mira: generated initial article content',
      );

      return {
        hasImprovements: true,
        comment: 'Generated initial article content',
        oldRevisionId: editResult.oldrevid,
        newRevisionId: editResult.newrevid,
      };
    } catch (error) {
      console.error('Error generating content for empty article:', error);
      return {
        hasImprovements: false,
        comment: 'Failed to generate article content',
        oldRevisionId: 0,
        newRevisionId: 0,
      };
    }
  }

  console.log(`Article: ${article.title}, ${wikitext!.length} chars`);

  const sections = splitArticleIntoSections(wikitext!);

  const systemPrompt = buildSystemPrompt(
    article.title,
    article.description,
    config.prompt,
    customInstructions,
  );

  let improvedWikitext = wikitext!;
  let improvedSections = 0;
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
          const hasChange = improvedContent.trim() !== section.content.trim();

          if (hasChange && improvedContent.trim()) {
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
      if (result) {
        replacements.push(result);
        improvedSections++;
      }
    }
  }

  console.log(
    `Complete: ${improvedSections}/${sections.length} sections improved`,
  );

  if (improvedSections === 0) {
    return {
      hasImprovements: false,
      comment: 'No improvements needed',
      oldRevisionId: 0,
      newRevisionId: 0,
    };
  }

  for (const replacement of replacements) {
    improvedWikitext = safeReplace(
      improvedWikitext,
      replacement.original,
      replacement.improved,
    );
  }

  if (improvedWikitext.trim() === wikitext!.trim()) {
    return {
      hasImprovements: false,
      comment: 'No changes detected',
      oldRevisionId: 0,
      newRevisionId: 0,
    };
  }

  const editResult = await mediawiki.editArticleAsBot(
    articleId,
    improvedWikitext,
    `Mira: reviewed and improved ${improvedSections} section(s)`,
  );

  return {
    hasImprovements: true,
    comment: `Improved ${improvedSections} section(s)`,
    oldRevisionId: editResult.oldrevid,
    newRevisionId: editResult.newrevid,
  };
}
