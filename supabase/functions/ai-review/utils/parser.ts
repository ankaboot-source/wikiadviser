import { AIResponse, ParsedResponse } from './types.ts';

export function parseAIResponseArray(
  content: string | null | undefined,
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

export function parseResponse(
  content: string | null | undefined,
  expectedCount: number,
): ParsedResponse {
  if (!content || typeof content !== 'string') {
    return {
      type: 'text',
      rawText: '',
    };
  }

  const jsonResponses = parseAIResponseArray(content);

  if (jsonResponses && jsonResponses.length === expectedCount) {
    console.log('Successfully parsed as JSON array');
    return {
      type: 'json',
      responses: jsonResponses,
    };
  }

  console.log('Falling back to plain text response');
  return {
    type: 'text',
    rawText: content.trim(),
  };
}

export function convertTextToResponse(
  rawText: string,
  changeIndex: number,
): AIResponse {
  const hasContent = rawText.trim().length > 0;

  return {
    change_index: changeIndex,
    has_changes: hasContent,
    comment: hasContent
      ? 'AI provided text-based improvement'
      : 'No changes needed',
    proposed_change: rawText.trim(),
  };
}

export function convertTextToBatchResponses(
  rawText: string,
  expectedCount: number,
  startIndex: number,
): AIResponse[] {
  const responses: AIResponse[] = [];

  const sections = rawText
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sections.length === expectedCount) {
    console.log(
      `Split text into ${expectedCount} sections matching change count`,
    );
    sections.forEach((section, i) => {
      responses.push({
        change_index: startIndex + i,
        has_changes: true,
        comment: 'AI provided text-based improvement',
        proposed_change: section,
      });
    });
  } else if (sections.length === 1) {
    console.log('Single text response - applying to first change only');
    responses.push({
      change_index: startIndex,
      has_changes: true,
      comment: 'AI provided text-based improvement',
      proposed_change: sections[0],
    });

    for (let i = 1; i < expectedCount; i++) {
      responses.push({
        change_index: startIndex + i,
        has_changes: false,
        comment: 'No changes needed',
        proposed_change: '',
      });
    }
  } else {
    console.log(
      `Text sections (${sections.length}) don't match changes (${expectedCount})`,
    );
    for (let i = 0; i < expectedCount; i++) {
      if (i < sections.length) {
        responses.push({
          change_index: startIndex + i,
          has_changes: true,
          comment: 'AI provided text-based improvement',
          proposed_change: sections[i],
        });
      } else {
        responses.push({
          change_index: startIndex + i,
          has_changes: false,
          comment: 'No changes needed',
          proposed_change: '',
        });
      }
    }
  }

  return responses;
}
