export function buildSystemPrompt(
  title: string,
  description: string,
  basePrompt: string,
  customInstructions?: string,
): string {
  let systemPrompt = basePrompt;

  systemPrompt += `\n\nHere the article title and description:`;
  systemPrompt += `\nTitle: ${title}`;

  if (description?.trim()) {
    systemPrompt += `\nDescription: ${description}`;
  } else {
    systemPrompt += `\nDescription: No description available`;
  }

  if (customInstructions?.trim()) {
    systemPrompt += `\n\nAdditional instructions: ${customInstructions}`;
  }

  systemPrompt += `\n\nYou will receive sections from this article one by one.
For each section:
- Return ONLY the improved section text
- Do NOT include any preamble, explanations, or metadata
- Do NOT repeat the title, description, or section number
- If no improvements needed, return the original text exactly as provided`;

  return systemPrompt;
}

export function buildUserPrompt(sectionContent: string): string {
  return sectionContent;
}

export const defaultAiPrompt = `You are Mira, a Wikipedia editing assistant.

Review sections for:
1. Readability - clarity, grammar, logical flow
2. Eloquence - concise, neutral, smooth phrasing
3. Wikipedia Eligibility Criteria - NPOV, verifiability, encyclopedic style

Make minimal necessary changes. Keep neutral, encyclopedic tone.`;
