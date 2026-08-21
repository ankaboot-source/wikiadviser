import MediawikiClient from '../../_shared/mediawikiAPI/MediawikiClient.ts';
import wikipediaApi from '../../_shared/wikipedia/WikipediaApi.ts';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildWholeArticleSystemPrompt,
  buildEmptyArticlePrompt,
  cleanAIResponse,
  extractDisplayTitle,
} from '../config/prompts.ts';
import { generateRevisionSummary, reviewArticleSection } from './aiService.ts';
import { splitArticleIntoSections } from './articleProcessor.ts';
import {
  parseChangedSections,
  findSectionByHeader,
  applyChangedSections,
} from './wholeArticleParser.ts';
import type { LLMConfig } from '../utils/types.ts';
import { getArticle } from '../../_shared/helpers/supabaseHelper.ts';
import createSupabaseAdmin from '../../_shared/supabaseAdmin.ts';

export interface ReviewResult {
  hasImprovements: boolean;
  comment: string;
  oldRevisionId: number;
  newRevisionId: number;
  wasEmpty: boolean;
}

export interface ChainState {
  chainId: string;
  batchIndex: number;
  totalBatches: number;
}

const BATCH_SIZE = 10;

const noImprovement = (comment: string): ReviewResult => ({
  hasImprovements: false,
  comment,
  oldRevisionId: 0,
  newRevisionId: 0,
  wasEmpty: false,
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
  const generated = await reviewArticleSection(
    config,
    buildEmptyArticlePrompt(article),
    `USER INSTRUCTION: ${customInstructions}\n\nGenerate content for this article:`,
  );

  const content = generated?.trim();
  if (!content || content.length < 50) return null;

  const displayTitle = extractDisplayTitle(existingWikitext);
  return displayTitle ? `${displayTitle}\n${content}` : content;
}

async function buildImprovedWikitextWholeArticle(
  wikitext: string,
  config: LLMConfig,
  systemPrompt: string,
): Promise<{ improvedWikitext: string; improvedSections: number } | null> {
  console.log('[whole-article] Sending whole article in a single call');
  const rawResponse = await reviewArticleSection(
    config,
    systemPrompt,
    wikitext,
    8192,
  );

  const changedSections = parseChangedSections(rawResponse);
  if (changedSections.length === 0) {
    console.log('[whole-article] No changed sections in response');
    return null;
  }

  const cleanedSections = changedSections.map((section) => {
    const originalSection = findSectionByHeader(wikitext, section.header);
    if (!originalSection) return section;
    return {
      ...section,
      content: cleanAIResponse(section.content, originalSection),
    };
  });

  const { improvedWikitext, replaced } = applyChangedSections(
    wikitext,
    cleanedSections,
  );
  console.log(
    `[whole-article] ${replaced}/${changedSections.length} sections replaced`,
  );

  if (replaced === 0) return null;
  return { improvedWikitext, improvedSections: replaced };
}

async function buildImprovedWikitextSectionWise(
  wikitext: string,
  config: LLMConfig,
  systemPrompt: string,
): Promise<{ improvedWikitext: string; improvedSections: number }> {
  const sections = splitArticleIntoSections(wikitext);
  const replacements: Array<{ original: string; improved: string }> = [];
  let lastError: Error | null = null;
  let failedSections = 0;

  for (let i = 0; i < sections.length; i += BATCH_SIZE) {
    const batch = sections.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (section, batchIdx) => {
        const idx = i + batchIdx;
        console.log(
          `Processing section ${idx + 1}/${sections.length}: ${section.content.length} chars`,
        );

        try {
          const rawResponse = await reviewArticleSection(
            config,
            systemPrompt,
            buildUserPrompt(section.content),
            8192,
          );

          console.log(
            `[debug] Section ${idx + 1} raw response (first 300 chars): "${rawResponse.substring(0, 300)}"`,
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
          lastError = error instanceof Error ? error : new Error(String(error));
          failedSections++;
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

  if (replacements.length === 0 && failedSections === sections.length && lastError) {
    throw lastError;
  }

  return { improvedWikitext, improvedSections: replacements.length };
}

async function buildImprovedWikitext(
  wikitext: string,
  config: LLMConfig,
  systemPrompt: string,
  wholeArticlePrompt: string,
): Promise<{ improvedWikitext: string; improvedSections: number }> {
  try {
    const wholeArticleResult = await buildImprovedWikitextWholeArticle(
      wikitext,
      config,
      wholeArticlePrompt,
    );
    if (wholeArticleResult) {
      console.log('[whole-article] Whole-article review succeeded');
      return wholeArticleResult;
    }
    console.log(
      '[whole-article] No improvements from whole-article pass, falling back to section-wise',
    );
  } catch (error) {
    console.warn(
      '[whole-article] Failed, falling back to section-wise:',
      error instanceof Error ? error.message : error,
    );
  }

  return buildImprovedWikitextSectionWise(wikitext, config, systemPrompt);
}

/**
 * Process one batch of a self-chaining review. Returns the chain state if
 * more batches remain, or null if this was the last batch and the article
 * was posted to MediaWiki.
 */
export async function processChainBatch(
  chainId: string,
  batchIndex: number,
  totalBatches: number,
  wikitext: string,
  improvedCount: number,
  language: string,
  config: LLMConfig,
  systemPrompt: string,
  customInstructions: string | undefined,
  articleId: string,
): Promise<{ chainState: ChainState | null; comment: string }> {
  const sections = splitArticleIntoSections(wikitext);
  const start = batchIndex * BATCH_SIZE;
  const end = Math.min(start + BATCH_SIZE, sections.length);
  const batch = sections.slice(start, end);
  const replacements: Array<{ original: string; improved: string }> = [];

  console.log(
    `[chain] Batch ${batchIndex + 1}/${totalBatches} (sections ${start + 1}-${end} of ${sections.length})`,
  );

  const results = await Promise.all(
    batch.map(async (section) => {
      console.log(
        `[chain] Processing section: ${section.content.length} chars`,
      );
      try {
        const rawResponse = await reviewArticleSection(
          config,
          systemPrompt,
          buildUserPrompt(section.content),
          8192,
        );
        const improvedContent = cleanAIResponse(rawResponse, section.content);
        if (
          improvedContent.trim() &&
          improvedContent.trim() !== section.content.trim()
        ) {
          console.log(`[chain] Section improved`);
          return { original: section.content, improved: improvedContent };
        }
        console.log(`[chain] Section unchanged`);
        return null;
      } catch (error) {
        console.error(
          `[chain] Section failed:`,
          error instanceof Error ? error.message : error,
        );
        return null;
      }
    }),
  );

  for (const result of results) {
    if (result) replacements.push(result);
  }

  const newWikitext = replacements.reduce(
    (text, { original, improved }) => safeReplace(text, original, improved),
    wikitext,
  );
  const newImprovedCount = improvedCount + replacements.length;

  const nextBatch = batchIndex + 1;

  if (nextBatch >= totalBatches) {
    // Last batch — post to MediaWiki
    console.log(
      `[chain] All batches complete. ${newImprovedCount}/${sections.length} sections improved. Posting to MediaWiki.`,
    );
    const mediawiki = new MediawikiClient(language, wikipediaApi);
    const summaryPhrase = await generateRevisionSummary(
      config,
      wikitext,
      newWikitext,
    );
    const editResult = await mediawiki.editArticleAsBot(
      articleId,
      newWikitext,
      `Mira: ${summaryPhrase}`,
    );

    // Mark chain complete
    const admin = createSupabaseAdmin();
    await admin
      .from('review_chains')
      .update({ status: 'completed', wikitext: newWikitext, improved_count: newImprovedCount })
      .eq('id', chainId);

    // Signal pending_diff
    await admin
      .from('articles')
      .update({ pending_diff: true })
      .eq('id', articleId);

    console.log('[chain] Review complete, pending_diff saved');
    return {
      chainState: null,
      comment: `Changes applied successfully (${newImprovedCount} sections improved).`,
    };
  }

  // Update chain state and continue
  const admin = createSupabaseAdmin();
  await admin
    .from('review_chains')
    .update({
      batch_index: nextBatch,
      wikitext: newWikitext,
      improved_count: newImprovedCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', chainId);

  console.log(
    `[chain] Batch ${batchIndex + 1} done. ${newImprovedCount}/${sections.length} improved. Next batch ${nextBatch + 1}/${totalBatches}.`,
  );
  return {
    chainState: { chainId, batchIndex: nextBatch, totalBatches },
    comment: `Review in progress: ${newImprovedCount}/${sections.length} sections improved.`,
  };
}

/**
 * Start a self-chaining review for the section-wise fallback.
 * Creates a chain record and processes the first batch.
 */
export async function startChainReview(
  articleId: string,
  language: string,
  config: LLMConfig,
  systemPrompt: string,
  customInstructions: string | undefined,
  wikitext: string,
): Promise<ChainState> {
  const sections = splitArticleIntoSections(wikitext);
  const totalBatches = Math.ceil(sections.length / BATCH_SIZE);
  const chainToken = crypto.randomUUID();

  console.log(
    `[chain] Starting chain review for ${sections.length} sections in ${totalBatches} batches`,
  );

  const admin = createSupabaseAdmin();
  const { data: chain, error } = await admin
    .from('review_chains')
    .insert({
      article_id: articleId,
      chain_token: chainToken,
      batch_index: 0,
      total_batches: totalBatches,
      wikitext,
      improved_count: 0,
      language,
      config_json: config,
      system_prompt: systemPrompt,
      custom_instructions: customInstructions,
      status: 'active',
    })
    .select('id')
    .single();

  if (error || !chain) {
    throw new Error(`Failed to create review chain: ${error?.message}`);
  }

  return { chainId: chain.id, batchIndex: 0, totalBatches };
}

function hasRealContent(wikitext: string): boolean {
  const stripped = wikitext
    .replaceAll(/\{\{DISPLAYTITLE:[^}]*\}\}/gi, '')
    .trim();
  return stripped.length > 0;
}

export async function reviewAndImproveArticle(
  articleId: string,
  language: string,
  config: LLMConfig,
  miraBotId: string,
  customInstructions?: string,
  chainMode?: boolean,
): Promise<ReviewResult | { chainState: ChainState; chainToken: string }> {
  const mediawiki = new MediawikiClient(language, wikipediaApi);
  const [articleData, article] = await Promise.all([
    mediawiki.getArticleForAIReview(articleId),
    getArticle(articleId),
  ]);

  const wikitext = articleData.wikitext ?? '';
  const isEmpty = !hasRealContent(wikitext);

  if (isEmpty) {
    if (!customInstructions?.trim()) {
      return noImprovement(
        'Article has no content. Add a custom prompt to generate content.',
      );
    }
    if (!article.title?.trim()) {
      return noImprovement('Article has no title — cannot generate content.');
    }

    const generated = await generateEmptyArticleContent(
      article,
      config,
      customInstructions,
      wikitext,
    );
    if (!generated) {
      return noImprovement('Generated content was too short or empty.');
    }

    const editResult = await mediawiki.editArticleAsBot(
      articleId,
      generated,
      'Mira: generated article content',
    );
    return {
      hasImprovements: true,
      comment: 'Changes applied successfully.',
      oldRevisionId: editResult.oldrevid,
      newRevisionId: editResult.newrevid,
      wasEmpty: true,
    };
  }

  console.log(
    `Article: "${article.title}", wikitext length: ${wikitext.length} chars`,
  );
  const systemPrompt = buildSystemPrompt(
    article.title,
    article.description,
    config.prompt,
    customInstructions,
  );
  const wholeArticlePrompt = buildWholeArticleSystemPrompt(
    article.title,
    article.description,
    config.prompt,
    customInstructions,
  );

  // Try whole-article first
  try {
    const wholeArticleResult = await buildImprovedWikitextWholeArticle(
      wikitext,
      config,
      wholeArticlePrompt,
    );
    if (wholeArticleResult) {
      console.log('[whole-article] Whole-article review succeeded');
      const { improvedWikitext, improvedSections } = wholeArticleResult;

      if (improvedSections === 0 || improvedWikitext.trim() === wikitext.trim()) {
        return noImprovement('No improvements needed.');
      }

      const summaryPhrase = await generateRevisionSummary(
        config,
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
        comment: 'Changes applied successfully.',
        oldRevisionId: editResult.oldrevid,
        newRevisionId: editResult.newrevid,
        wasEmpty: false,
      };
    }
    console.log(
      '[whole-article] No improvements from whole-article pass',
    );
  } catch (error) {
    console.warn(
      '[whole-article] Failed:',
      error instanceof Error ? error.message : error,
    );
  }

  // Whole-article didn't work — chain or sync fallback
  if (chainMode) {
    console.log('[chain] Starting self-chaining review');
    const chainState = await startChainReview(
      articleId,
      language,
      config,
      systemPrompt,
      customInstructions,
      wikitext,
    );

    // Get the chain token from DB
    const admin = createSupabaseAdmin();
    const { data: chain } = await admin
      .from('review_chains')
      .select('chain_token')
      .eq('id', chainState.chainId)
      .single();

    return {
      chainState,
      chainToken: chain?.chain_token || '',
    };
  }

  // Sync section-wise fallback
  const { improvedWikitext, improvedSections } =
    await buildImprovedWikitextSectionWise(wikitext, config, systemPrompt);

  if (improvedSections === 0 || improvedWikitext.trim() === wikitext.trim()) {
    return noImprovement(
      improvedSections === 0
        ? 'No improvements needed.'
        : 'No changes detected.',
    );
  }

  const summaryPhrase = await generateRevisionSummary(
    config,
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
    comment: 'Changes applied successfully.',
    oldRevisionId: editResult.oldrevid,
    newRevisionId: editResult.newrevid,
    wasEmpty: false,
  };
}
