import MediawikiClient from '../../_shared/mediawikiAPI/MediawikiClient.ts';
import wikipediaApi from '../../_shared/wikipedia/WikipediaApi.ts';
import { buildSystemPrompt, buildUserPrompt } from '../config/prompts.ts';
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

function cleanAIResponse(response: string, originalContent: string): string {
  let cleaned = response.trim();
  cleaned = cleaned.trim();
  if (cleaned.length < originalContent.length * 0.2) {
    return originalContent;
  }
  return cleaned;
}
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
  _miraBotId: string,
  customInstructions?: string,
): Promise<ReviewResult> {
  const mediawiki = new MediawikiClient(language, wikipediaApi);

  const articleData = await mediawiki.getArticleForAIReview(articleId);

  const article = await getArticle(articleId);

  console.log(
    `Article: ${article.title}, ${articleData.wikitext.length} chars`,
  );

  const sections = splitArticleIntoSections(articleData.wikitext);

  const systemPrompt = buildSystemPrompt(
    article.title,
    article.description,
    config.prompt,
    customInstructions,
  );

  let improvedWikitext = articleData.wikitext;
  let improvedSections = 0;
  const replacements: Array<{ original: string; improved: string }> = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    console.log(
      `Processing ${i + 1}/${sections.length}: ${section.content.length} chars`,
    );

    const userPrompt = buildUserPrompt(section.content);

    const rawResponse = await reviewArticleSection(
      config.apiKey,
      config.model,
      systemPrompt,
      userPrompt,
    );

    const improvedContent = cleanAIResponse(rawResponse, section.content);

    const hasChange = improvedContent.trim() !== section.content.trim();

    if (hasChange && improvedContent.trim()) {
      replacements.push({
        original: section.content,
        improved: improvedContent,
      });
      improvedSections++;
      console.log(`Section ${i + 1}/${sections.length}: improved`);
    } else {
      console.log(`Section ${i + 1}/${sections.length}: unchanged`);
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

  if (improvedWikitext.trim() === articleData.wikitext.trim()) {
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
