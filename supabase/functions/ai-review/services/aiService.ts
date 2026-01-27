import { AIResponse } from '../utils/types.ts';
import { parseAIResponseArray } from '../utils/parser.ts';

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
      response_format: { type: 'json_object' },
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
): AIResponse[] | null {
  const choice = data?.choices?.[0];
  const content = choice?.message?.content ?? choice?.text ?? null;

  if (!content) {
    console.error('No content in AI response');
    return null;
  }

  console.log(
    'Raw AI response (first 1000 chars):',
    content.substring(0, 1000),
  );

  const parsed = parseAIResponseArray(content);

  if (!parsed || parsed.length !== expectedCount) {
    console.error(
      `Expected ${expectedCount} responses, got ${parsed?.length || 0}`,
    );
    return null;
  }

  return parsed;
}
