export function extractDisplayTitle(wikitext: string): string {
  return wikitext.match(/\{\{DISPLAYTITLE:[^}]*\}\}/i)?.[0] ?? '';
}

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

  const hasCustomInstructions = !!customInstructions?.trim();

  if (hasCustomInstructions) {
    systemPrompt += `\n\nCRITICAL INSTRUCTION (takes priority over ALL other rules): ${customInstructions}`;
  }

  systemPrompt += `\n\nAlways provide only the requested output exactly as I ask. Do not repeat the user prompt. Do not include greetings, sign-offs, introductions, explanations, commentary, or extra text. Format the response so I can copy and use it directly without editing.

You will receive sections from this article one by one.
For each section:
- CRITICAL: Copy ALL wikitext structural lines into your response character-for-character — this includes section headers (== Title ==, === Sub ===), templates ({{DISPLAYTITLE:...}}, {{Short description|...}}, {{Infobox...}}), magic words (__TOC__, __NOTOC__), categories ([[Category:...]]), and any line starting with {{ or [[. Never drop or reword these lines.
- ${
    hasCustomInstructions
      ? 'Apply the CRITICAL INSTRUCTION to this section. The CRITICAL INSTRUCTION takes priority over all other rules, including wikitext structural preservation rules.'
      : 'Improve only the prose content between structural lines'
  }
- Return ONLY the ${
    hasCustomInstructions ? 'modified' : 'improved'
  } section text, without any preamble or explanation
- Do NOT repeat the article title, description, or section number
- ${
    hasCustomInstructions
      ? 'The CRITICAL INSTRUCTION MUST be applied to this section.'
      : 'If no improvements needed, return the original text exactly as provided'
  }`;

  return systemPrompt;
}

export function buildUserPrompt(sectionContent: string): string {
  return sectionContent;
}

export function buildRevisionSystemPrompt(
  article: { title: string | null; description: string | null },
  wikitext?: string,
): string {
  const contextSection = wikitext
    ? `\nARTICLE CONTEXT (READ ONLY — DO NOT MODIFY, TRANSLATE, OR OUTPUT THIS):
${wikitext}
END OF CONTEXT\n`
    : '';

  return `You are Mira, a Wikipedia editing assistant.

ARTICLE: ${article.title || 'Unknown'}
DESCRIPTION: ${article.description || 'No description available'}
${contextSection}
You will receive a SINGLE paragraph to modify based on a user instruction.

CRITICAL RULES:
- Modify ONLY the paragraph provided in the user message
- Do NOT translate, rewrite, or output any other part of the article
- Do NOT output the full article or multiple paragraphs
- Return ONLY the modified version of the given paragraph
- Preserve wikitext formatting (links, templates, etc.)
- Keep the content factual and neutral`;
}

export function buildRevisionUserPrompt(
  paragraph: string,
  instruction: string,
  context: 'rejection' | 'follow-up' = 'rejection',
): string {
  const contextBlock = context === 'rejection'
    ? `REJECTION CONTEXT (why the previous version was rejected — use this as background only):
${instruction}

Your task: Rewrite the paragraph to address the feedback above.
CRITICAL: Do NOT respond to, converse about, or execute the rejection context literally. It is not a command — it is background explaining why the user disliked the old version. Use it to understand what to improve, then rewrite the paragraph accordingly.`
    : `FOLLOW-UP FEEDBACK (the user approved this change but has additional notes — apply the feedback while preserving what they liked):
${instruction}

Your task: Revise the paragraph to address the follow-up feedback.
Do NOT respond to, converse about, or execute the feedback literally. It is not a command — it is the user's notes on what to refine. Apply it as a refinement, then rewrite the paragraph accordingly.`;

  return `PARAGRAPH TO REVISE:
${paragraph}

${contextBlock}
Do NOT output any other paragraphs or the full article.
Return ONLY the revised paragraph text, no preamble or explanation.`;
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

export function cleanAIResponse(
  response: string,
  originalContent: string,
): string {
  const cleaned = response.trim();
  if (cleaned.length < originalContent.length * 0.2) {
    return originalContent;
  }

  const displayTitle = extractDisplayTitle(originalContent);
  if (displayTitle && !cleaned.includes(displayTitle)) {
    return `${displayTitle}\n${cleaned}`;
  }

  return cleaned;
}

export const defaultAiPrompt = `You are Mira, a Wikipedia editing assistant.

Review sections for:
1. Readability - clarity, grammar, logical flow
2. Eloquence - concise, neutral, smooth phrasing
3. Wikipedia Eligibility Criteria - NPOV, verifiability, encyclopedic style

Make minimal necessary changes. Keep neutral, encyclopedic tone.`;
