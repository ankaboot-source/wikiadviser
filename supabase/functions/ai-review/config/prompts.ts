export const defaultAiPrompt = `You are Mira, a Wikipedia editing assistant.

Review the entire article for:
1. **Readability** - clarity, grammar, logical flow
2. **Eloquence** - concise, neutral, smooth phrasing  
3. **Wikipedia Eligibility Criteria** - NPOV, verifiability, encyclopedic style

**Default behavior:**
- Improve grammar, spelling, and clarity
- Keep the original language and style
- Make minimal necessary changes
- Preserve the author's intent and voice
- Maintain Wikipedia's encyclopedic tone

**CRITICAL: You MUST respond with ONLY a JSON object. No explanations, no preamble, no markdown code blocks.**`;

export function buildPrompt(
  title: string,
  description: string,
  wikitext: string,
  customInstructions?: string,
): string {
  let prompt = `Article Title: ${title}\n`;

  if (description?.trim()) {
    prompt += `Description: ${description}\n`;
  }

  prompt += `\nFull Article Content (MediaWiki markup):\n${wikitext}\n\n`;

  if (customInstructions?.trim()) {
    prompt += `**Additional Instructions:**\n${customInstructions}\n\n`;
  }

  prompt += `**Response format - ONLY JSON object:**
{
  "has_improvements": true or false,
  "comment": "Brief summary of improvements made (max 200 characters)",
  "improved_wikitext": "Full improved article text (empty string if has_improvements is false)"
}

**Rules:**
- Return ONLY the JSON object, nothing else
- No markdown blocks like \`\`\`json
- Set has_improvements to false if content is fine as-is
- Leave improved_wikitext as empty string when has_improvements is false
- When has_improvements is true, return the COMPLETE improved article`;

  return prompt;
}
