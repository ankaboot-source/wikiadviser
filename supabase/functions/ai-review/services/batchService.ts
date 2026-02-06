import {
  DiffChange,
  AIResponse,
  LLMConfig,
  BatchResult,
} from '../utils/types.ts';
import { buildBatchPrompt, calculateTokens } from './promptService.ts';
import { callOpenRouter, validateResponse } from './aiService.ts';

export function splitIntoBatches(
  changes: DiffChange[],
  batchSize: number,
): DiffChange[][] {
  const batches: DiffChange[][] = [];
  for (let i = 0; i < changes.length; i += batchSize) {
    batches.push(changes.slice(i, i + batchSize));
  }
  return batches;
}

export async function processBatch(
  batch: DiffChange[],
  startIndex: number,
  config: LLMConfig,
  retryCount = 0,
): Promise<BatchResult> {
  try {
    const batchedPrompt = buildBatchPrompt(batch, startIndex);
    const { estimatedInput, maxResponse } = calculateTokens(
      batchedPrompt.length,
      batch.length,
    );

    console.log(
      `  Prompt: ${batchedPrompt.length} chars (~${estimatedInput} tokens)`,
    );
    console.log(`  Max response: ${maxResponse} tokens`);

    const data = await callOpenRouter(
      config.apiKey,
      config.model,
      config.prompt,
      batchedPrompt,
      maxResponse,
    );

    const finishReason = data?.choices?.[0]?.finish_reason;
    console.log('  Finish reason:', finishReason);

    if (finishReason === 'length' && retryCount < 2 && batch.length > 1) {
      console.warn('Response truncated, retrying with smaller batch');
      const halfSize = Math.ceil(batch.length / 2);

      const firstHalf = await processBatch(
        batch.slice(0, halfSize),
        startIndex,
        config,
        retryCount + 1,
      );

      const secondHalf = await processBatch(
        batch.slice(halfSize),
        startIndex + halfSize,
        config,
        retryCount + 1,
      );

      if (firstHalf.success && secondHalf.success) {
        return {
          success: true,
          responses: [...firstHalf.responses, ...secondHalf.responses],
          isFallback: firstHalf.isFallback || secondHalf.isFallback,
        };
      }
    }

    const { responses, isFallback } = validateResponse(
      data,
      batch.length,
      startIndex,
    );

    if (isFallback) {
      console.log('Using text-based fallback for this batch');
    }

    if (finishReason === 'length') {
      console.warn(
        `Truncation resulted in incomplete responses: ${responses.length}/${batch.length}`,
      );
    }

    return {
      success: true,
      responses,
      isFallback,
    };
  } catch (error) {
    console.error('Batch processing error:', error);
    const fallbackResponses: AIResponse[] = [];
    for (let i = 0; i < batch.length; i++) {
      fallbackResponses.push({
        change_index: startIndex + i,
        has_changes: false,
        comment: error instanceof Error ? error.message : 'Processing error',
        proposed_change: '',
      });
    }
    return {
      success: false,
      responses: fallbackResponses,
      error: error instanceof Error ? error.message : String(error),
      isFallback: true,
    };
  }
}

export async function processAllBatches(
  changes: DiffChange[],
  config: LLMConfig,
  batchSize = 10,
): Promise<AIResponse[]> {
  const batches = splitIntoBatches(changes, batchSize);
  console.log(
    `Split ${changes.length} changes into ${batches.length} batch(es)`,
  );

  const allResponses: AIResponse[] = [];
  let fallbackCount = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const startIndex = batchIndex * batchSize;

    console.log(
      `\n=== Batch ${batchIndex + 1}/${batches.length} (${batch.length} changes) ===`,
    );

    const result = await processBatch(batch, startIndex, config);

    if (result.success) {
      console.log(`  ✓ Success: ${result.responses.length} responses`);
      if (result.isFallback) {
        fallbackCount++;
      }
      allResponses.push(...result.responses);
    } else {
      console.error(`  ✗ Failed: ${result.error}`);
      allResponses.push(...result.responses);
    }
  }

  if (fallbackCount > 0) {
    console.log(
      `\n${fallbackCount}/${batches.length} batches used text-based fallback`,
    );
  }

  return allResponses;
}
