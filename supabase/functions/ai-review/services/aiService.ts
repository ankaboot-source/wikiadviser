import { AIResponse, ParsedResponse } from '../utils/types.ts';
import { parseResponse, convertTextToBatchResponses } from '../utils/parser.ts';

export interface OpenRouterResponse {
  choices?: Array<{
    message?: { content?: string };
    text?: string;
    finish_reason?: string;
  }>;
}

export async function callOpenRouter(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<OpenRouterResponse> {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`API error ${resp.status}: ${errorText}`);
  }

  return await resp.json();
}

export function validateResponse(
  data: OpenRouterResponse,
  expectedCount: number,
  startIndex: number,
): { responses: AIResponse[]; isFallback: boolean } {
  const choice = data?.choices?.[0];
  const content = choice?.message?.content ?? choice?.text ?? null;

  if (!content) {
    console.error('No content in AI response');
    const fallbackResponses: AIResponse[] = [];
    for (let i = 0; i < expectedCount; i++) {
      fallbackResponses.push({
        change_index: startIndex + i,
        has_changes: false,
        comment: 'No content in AI response',
        proposed_change: '',
      });
    }
    return { responses: fallbackResponses, isFallback: true };
  }

  console.log(
    'Raw AI response (first 1000 chars):',
    content.substring(0, 1000),
  );

  const parsed: ParsedResponse = parseResponse(content, expectedCount);

  if (parsed.type === 'json' && parsed.responses) {
    console.log(`Parsed as JSON array: ${parsed.responses.length} items`);
    return { responses: parsed.responses, isFallback: false };
  }

  console.log('Using plain text response as fallback');
  const textResponses = convertTextToBatchResponses(
    parsed.rawText || '',
    expectedCount,
    startIndex,
  );

  return { responses: textResponses, isFallback: true };
}
