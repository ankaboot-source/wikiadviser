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

    if (finishReason === 'length') {
      return {
        success: false,
        responses: [],
        error: 'Response truncated',
      };
    }

    const responses = validateResponse(data, batch.length);

    if (!responses) {
      return {
        success: false,
        responses: [],
        error: 'Invalid response format',
      };
    }

    return {
      success: true,
      responses,
    };
  } catch (error) {
    return {
      success: false,
      responses: [],
      error: error instanceof Error ? error.message : String(error),
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

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const startIndex = batchIndex * batchSize;

    console.log(
      `\n=== Batch ${batchIndex + 1}/${batches.length} (${batch.length} changes) ===`,
    );

    const result = await processBatch(batch, startIndex, config);

    if (result.success) {
      console.log(`  ✓ Success: ${result.responses.length} responses`);
      allResponses.push(...result.responses);
    } else {
      console.error(`  ✗ Failed: ${result.error}`);
      for (let i = 0; i < batch.length; i++) {
        allResponses.push({
          change_index: startIndex + i,
          has_changes: false,
          comment: result.error || 'Processing error',
          proposed_change: '',
        });
      }
    }
  }

  return allResponses;
}
