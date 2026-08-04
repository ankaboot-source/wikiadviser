export const REFUSAL_TOKEN = 'MIRA_REFUSAL';

export const REFUSAL_INSTRUCTION =
  `If you cannot or will not fulfill the request (for example due to content policy), ` +
  `respond with exactly this token and nothing else: ${REFUSAL_TOKEN}`;

export const REFUSAL_USER_MESSAGE =
  'The AI refused to process the request (content policy). Consider rephrasing your instructions.';

export class AIRefusalError extends Error {
  readonly responseText: string;

  constructor(responseText: string) {
    super(
      `AI refused the request (content policy): "${responseText.substring(0, 120)}"`,
    );
    this.name = 'AIRefusalError';
    this.responseText = responseText;
  }
}

export function isRefusalResponse(text: string): boolean {
  return text.trim().startsWith(REFUSAL_TOKEN);
}

export function assertNotRefusal(text: string): void {
  if (isRefusalResponse(text)) {
    throw new AIRefusalError(text);
  }
}
