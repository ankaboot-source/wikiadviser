import { AIProvider, ChatCompletionParams } from './types.ts';

export class GeminiProvider implements AIProvider {
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  async chatCompletion(params: ChatCompletionParams): Promise<string> {
    const url = `${this.baseUrl}/models/${params.model}:generateContent?key=${params.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: params.systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: params.userPrompt }],
          },
        ],
        generationConfig: {
          temperature: params.temperature ?? 0.2,
          maxOutputTokens: params.maxTokens ?? 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API request failed', {
        status: response.status,
        error: errorText,
      });
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Empty response from Gemini');
    return content.trim();
  }
}
