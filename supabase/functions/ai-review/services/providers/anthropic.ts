import { AIProvider, ChatCompletionParams } from './types.ts';

export class AnthropicProvider implements AIProvider {
  private baseUrl = 'https://api.anthropic.com/v1';

  async chatCompletion(params: ChatCompletionParams): Promise<string> {
    const url = `${this.baseUrl}/messages`;
    console.log(`[Anthropic] POST ${url} model="${params.model}"`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': params.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        system: params.systemPrompt,
        messages: [{ role: 'user', content: params.userPrompt }],
        max_tokens: params.maxTokens ?? 1024,
        temperature: params.temperature ?? 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API request failed', {
        status: response.status,
        error: errorText,
      });
      throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[Anthropic] API responded successfully model="${data.model || params.model}" status=${response.status}`);
    const content = data.content?.[0]?.text;
    if (!content) throw new Error('Empty response from Anthropic');
    return content.trim();
  }
}
