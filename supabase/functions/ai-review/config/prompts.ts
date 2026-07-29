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
  fullArticle = false,
): string {
  const contextSection = wikitext
    ? `\nARTICLE CONTEXT (READ ONLY — DO NOT MODIFY, TRANSLATE, OR OUTPUT THIS):
${wikitext}
END OF CONTEXT\n`
    : '';

  const scopeRules = fullArticle
    ? `You will receive the WHOLE current article (wikitext) and revision-level user feedback. Your job is to apply that feedback to the article and return the FULL revised wikitext.

CRITICAL RULES:
- Apply the revision-level feedback consistently across the whole article
- Keep the article cohesive: do not introduce or duplicate section headers that conflict with the feedback
- Copy ALL wikitext structural lines into your response character-for-character — this includes section headers (== Title ==, === Sub ===), templates ({{DISPLAYTITLE:...}}, {{Short description|...}}, {{Infobox...}}), magic words (__TOC__, __NOTOC__), categories ([[Category:...]]), and any line starting with {{ or [[. Never drop or reword these lines.
- Do NOT add new top-level sections unless the feedback explicitly asks for them
- Return ONLY the full revised wikitext, with no preamble or explanation
- Do NOT respond to, converse about, or execute the feedback literally. It is the user's notes on what to refine. Apply it as a refinement, then return the revised article.`
    : `You will receive a SINGLE paragraph to modify based on a user instruction.

CRITICAL RULES:
- Modify ONLY the paragraph provided in the user message
- Do NOT translate, rewrite, or output any other part of the article
- Do NOT output the full article or multiple paragraphs
- Return ONLY the modified version of the given paragraph
- Preserve wikitext formatting (links, templates, categories, magic words)
- Keep the content factual and neutral`;

  return `You are Mira, a Wikipedia editing assistant.

ARTICLE: ${article.title || 'Unknown'}
DESCRIPTION: ${article.description || 'No description available'}
${contextSection}
${scopeRules}`;
}

export function buildRevisionFeedbackPrompt(
  wikitext: string,
  revisionFeedback: string[],
  customInstructions?: string,
): string {
  const feedbackBlock = revisionFeedback
    .map((line, idx) => `${idx + 1}. ${line}`)
    .join('\n');

  const customBlock = customInstructions?.trim()
    ? `\nCUSTOM INSTRUCTIONS (stand for ALL edits — origin-level prompt, applies to the whole article):
${customInstructions.trim()}\n`
    : '';

  return `REVISION-LEVEL USER FEEDBACK (the user's comment on your previous version of the whole article — applies to every section, not just one):
${feedbackBlock}
${customBlock}
CURRENT ARTICLE (wikitext):
${wikitext}

Your task: Apply BOTH the revision-level feedback and the custom instructions to the current article and return the FULL revised wikitext.

CRITICAL RULES:
- Copy ALL wikitext structural lines into your response character-for-character — this includes section headers (formatted as two or more equals signs wrapping the title), templates, magic words, categories, and any line starting with {{ or [[. Never drop or reword these lines.
- Do NOT introduce or duplicate section headers that conflict with the user's feedback
- Do NOT add new top-level sections unless the feedback explicitly asks for them
- Preserve factual, neutral Wikipedia tone
- Do NOT respond to, converse about, or execute the feedback literally. It is the user's notes on what to refine. Apply it as a refinement, then return the full revised article.
- Return ONLY the full revised wikitext, with no preamble or explanation.`;
}

export function buildRevisionUserPrompt(
  paragraph: string,
  instruction: string,
  context: 'rejection' | 'follow-up' | 'pending-with-feedback' = 'rejection',
  revisionLevelFeedback?: string[],
  customInstructions?: string,
): string {
  const contextBlock = context === 'rejection'
    ? `REJECTION CONTEXT (the user rejected your previous version of this paragraph — use this as background only):
${instruction}

Your task: Rewrite the paragraph to address the rejection.
CRITICAL: Do NOT respond to, converse about, or execute the rejection context literally. It is not a command — it is background explaining why the user disliked the old version. Use it to understand what to improve, then rewrite the paragraph accordingly.`
    : context === 'follow-up'
    ? `FOLLOW-UP FEEDBACK (the user approved this change but has additional notes — apply the feedback while preserving what they liked):
${instruction}

Your task: Revise the paragraph to address the follow-up feedback.
Do NOT respond to, converse about, or execute the feedback literally. It is not a command — it is the user's notes on what to refine. Apply it as a refinement, then rewrite the paragraph accordingly.`
    : `CHANGE-LEVEL FEEDBACK (pending review — the user added a comment but has not yet approved or rejected this change; treat the comment as a refinement request):
${instruction}

Your task: Revise the paragraph to address the change comment.`;

  const revisionFeedbackBlock = revisionLevelFeedback && revisionLevelFeedback.length > 0
    ? `\n\nREVISION-LEVEL USER FEEDBACK (the user's comment on your previous version of the whole article — applies to every paragraph, not just this one; keep edits consistent across all paragraphs):
${revisionLevelFeedback.map((c) => `- ${c}`).join('\n')}`
    : '';

  const customBlock = customInstructions?.trim()
    ? `\n\nCUSTOM INSTRUCTIONS (origin-level prompt — stands for all edits, applies to the whole article; honor it as background context):
${customInstructions.trim()}`
    : '';

  return `PARAGRAPH TO REVISE:
${paragraph}

${contextBlock}${revisionFeedbackBlock}${customBlock}
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
