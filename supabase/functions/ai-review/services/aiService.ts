export interface AIReviewResponse {
  has_improvements: boolean;
  comment: string;
  improved_wikitext: string;
}

export async function reviewFullArticle(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<AIReviewResponse> {
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
  const finishReason = data.choices?.[0]?.finish_reason;

  if (!content) {
    console.error('Empty response from AI');
    throw new Error('Empty response from AI');
  }

  if (finishReason === 'length') {
    console.warn('AI response was truncated due to length limit');
  }

  try {
    const cleaned = content
      .trim()
      .replaceAll(/```json\s*/g, '')
      .replaceAll(/```\s*/g, '')
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.debug('Successfully parsed AI response', {
        has_improvements: parsed.has_improvements,
        commentLength: String(parsed.comment || '').length,
        improvedLength: String(parsed.improved_wikitext || '').length,
      });

      return {
        has_improvements: parsed.has_improvements ?? false,
        comment: String(parsed.comment || 'Review completed').trim(),
        improved_wikitext: String(parsed.improved_wikitext || '').trim(),
      };
    }

    throw new Error('No valid JSON found in response');
  } catch (error) {
    console.warn('Failed to parse AI response as JSON', {
      error: error instanceof Error ? error.message : String(error),
      contentPreview: content.substring(0, 500),
    });

    return {
      has_improvements: false,
      comment: 'Failed to parse AI response',
      improved_wikitext: '',
    };
  }
}
