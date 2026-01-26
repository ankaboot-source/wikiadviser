import { AIResponse } from './types.ts';

export function parseAIResponseArray(
  content: string | null | undefined
): AIResponse[] | null {
  if (!content || typeof content !== 'string') return null;

  const cleaned = content
    .trim()
    .replaceAll(/```json\s*/g, '')
    .replaceAll(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        change_index: item.change_index ?? -1,
        has_changes: item.has_changes ?? false,
        comment: String(item.comment || 'No comment').trim(),
        proposed_change: String(item.proposed_change || '').trim(),
      }));
    }
  } catch (error) {
    console.log('Direct parse failed, attempting cleanup...', error);
  }

  try {
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          change_index: item.change_index ?? -1,
          has_changes: item.has_changes ?? false,
          comment: String(item.comment || 'No comment').trim(),
          proposed_change: String(item.proposed_change || '').trim(),
        }));
      }
    }
  } catch (error) {
    console.error('Array extraction failed:', error);
  }

  return null;
}
