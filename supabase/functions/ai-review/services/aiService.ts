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
export async function generateRevisionSummary(
  apiKey: string,
  model: string,
  oldText: string,
  newText: string,
): Promise<string> {
  try {
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
            {
              role: 'system',
              content:
                'You summarise text edits in 3-7 words as a lowercase verb phrase. ' +
                'Examples: "translated introduction", "improved grammar and clarity", ' +
                '"expanded lead section", "fixed wikitext formatting". ' +
                'Respond with ONLY the phrase, no punctuation.',
            },
            {
              role: 'user',
              content: `BEFORE:\n${oldText.slice(0, 800)}\n\nAFTER:\n${newText.slice(0, 800)}`,
            },
          ],
          max_tokens: 20,
          temperature: 0,
        }),
      },
    );

    if (!response.ok) return 'reviewed article';

    const data = await response.json();
    const phrase = data.choices?.[0]?.message?.content?.trim().toLowerCase();
    return phrase || 'reviewed article';
  } catch {
    return 'reviewed article';
  }
}
