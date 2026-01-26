import { DiffChange } from '../utils/types.ts';

export function getEditTypeName(
  changeType: 'insert' | 'delete' | 'change'
): string {
  const types: Record<string, string> = {
    insert: 'INSERT',
    delete: 'DELETE',
    change: 'CHANGE',
  };
  return types[changeType] || 'UNKNOWN';
}

export function buildBatchPrompt(
  changes: DiffChange[],
  startIndex: number
): string {
  let prompt = `Review the following ${changes.length} changes:\n\n`;

  changes.forEach((change, i) => {
    const editType = getEditTypeName(change.type);
    const actualIndex = startIndex + i;
    prompt += `--- CHANGE ${actualIndex} (${editType}) ---\n`;

    if (change.type === 'delete') {
      prompt += `DELETED: ${change.oldText}\n\n`;
    } else if (change.type === 'insert') {
      prompt += `ADDED: ${change.newText}\n\n`;
    } else if (change.type === 'change') {
      prompt += `BEFORE: ${change.oldText}\n`;
      prompt += `AFTER: ${change.newText}\n\n`;
    }
  });

  prompt += `\nReturn a JSON array with ${changes.length} objects (change_index ${startIndex} to ${startIndex + changes.length - 1}).`;

  return prompt;
}

export function calculateTokens(
  promptLength: number,
  numChanges: number
): {
  estimatedInput: number;
  maxResponse: number;
} {
  const estimatedInput = Math.ceil(promptLength / 4);
  const maxResponse = Math.max(2000, numChanges * 400 + 1000);

  return { estimatedInput, maxResponse };
}
