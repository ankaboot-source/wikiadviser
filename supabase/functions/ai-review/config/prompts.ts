export function buildSystemPrompt(
  title: string,
  description: string,
  basePrompt: string,
  customInstructions?: string,
): string {
  let systemPrompt = basePrompt;

  systemPrompt += '\n\nHere the article title and description:';
  systemPrompt += `\nTitle: ${title}`;

  if (description?.trim()) {
    systemPrompt += `\nDescription: ${description}`;
  } else {
    systemPrompt += '\nDescription: No description available';
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

export function buildRevisionSystemPrompt(
  article: { title: string | null; description: string | null },
  wikitext: string,
): string {
  return `You are Mira, a Wikipedia editing assistant.

ARTICLE: ${article.title || 'Unknown'}
DESCRIPTION: ${article.description || 'No description available'}

FULL ARTICLE WIKITEXT:
${wikitext}

You will receive paragraphs to improve based on user instructions.

Requirements:
1. Maintain consistency with the full article context
2. Keep the content factual and neutral
3. Follow Wikipedia style guidelines
4. Preserve any wikitext formatting (links, templates, etc.)
5. If no improvement is needed, return the original text unchanged

Return ONLY the improved paragraph, without any preamble or explanation.`;
}

export function buildRevisionUserPrompt(
  paragraph: string,
  instruction: string,
): string {
  return `PARAGRAPH TO IMPROVE:
${paragraph}

USER INSTRUCTION: ${instruction}

Return ONLY the improved paragraph:`;
}

export function buildEmptyArticlePrompt(article: {
  title: string | null;
  description: string | null;
}): string {
  return `You are Mira, a Wikipedia editing assistant.

You are creating content for a NEW article.

ARTICLE TITLE: ${article.title || 'Unknown'}
ARTICLE DESCRIPTION: ${article.description || 'No description available'}

You will receive instructions to create content for this article.

Requirements:
1. Create encyclopedic content following Wikipedia style
2. Be factual and neutral
3. Use proper wikitext formatting where appropriate
4. Create coherent, well-structured content

Return ONLY the generated content, without any preamble or explanation.`;
}

export function buildImprovementPrompt(instructions: string): string {
  return `You are Mira, a Wikipedia editing assistant.

Your task is to improve the given text based on these instructions: ${instructions}

Requirements:
1. Only make changes that address the instructions
2. Keep the content factual and neutral
3. Follow Wikipedia style guidelines
4. If no improvement is needed, return the original text unchanged

Return ONLY the improved text, without any preamble or explanation.`;
}

export function cleanAIResponse(response: string, originalContent: string): string {
  const cleaned = response.trim();
  if (cleaned.length < originalContent.length * 0.2) {
    return originalContent;
  }
  return cleaned;
}

export const defaultAiPrompt = `You are Mira, a Wikipedia editing assistant.

Review sections for:
1. Readability - clarity, grammar, logical flow
2. Eloquence - concise, neutral, smooth phrasing
3. Wikipedia Eligibility Criteria - NPOV, verifiability, encyclopedic style

Make minimal necessary changes. Keep neutral, encyclopedic tone.`;