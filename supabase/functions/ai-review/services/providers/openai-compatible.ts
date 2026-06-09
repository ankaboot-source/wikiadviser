import { AIProvider, ChatCompletionParams } from './types.ts';

export class OpenAICompatibleProvider implements AIProvider {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async chatCompletion(params: ChatCompletionParams): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: params.temperature ?? 0.2,
        max_tokens: params.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API request failed', {
        status: response.status,
        error: errorText,
      });
      throw new Error(`AI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI');
    return content.trim();
  }
}
