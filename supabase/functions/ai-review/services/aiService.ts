export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function reviewArticleSection(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const response = await fetch(
    'https://openrouter.ai/api/v1/chat/completions',
    {
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
        temperature: 0.2,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API request failed', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`AI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  if (!content) {
    console.error('Empty response from AI');
    throw new Error('Empty response from AI');
  }

  return content.trim();
}

export async function callAIWithHistory(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const response = await fetch(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.3,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI chat request failed', {
      status: response.status,
      error: errorText,
    });
    throw new Error(`AI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  if (!content) {
    console.error('Empty chat response from AI');
    throw new Error('Empty response from AI');
  }

  return content.trim();
}
