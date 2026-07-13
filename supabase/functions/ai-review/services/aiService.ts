import { LLMConfig } from '../utils/types.ts';
import { assertFreeModelAllowed } from '../utils/freeModelGuard.ts';
import { OpenAICompatibleProvider } from './providers/openai-compatible.ts';
import { AnthropicProvider } from './providers/anthropic.ts';
import { GeminiProvider } from './providers/gemini.ts';
import { AIProvider } from './providers/types.ts';

const PROVIDER_ENDPOINTS: Record<string, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
};

function getProvider(config: LLMConfig): AIProvider {
  switch (config.provider) {
    case 'openrouter':
      return new OpenAICompatibleProvider(PROVIDER_ENDPOINTS.openrouter);
    case 'openai':
      return new OpenAICompatibleProvider(PROVIDER_ENDPOINTS.openai);
    case 'anthropic':
      return new AnthropicProvider();
    case 'gemini':
      return new GeminiProvider();
    case 'custom':
      if (!config.endpoint) throw new Error('Custom provider requires an endpoint URL');
      return new OpenAICompatibleProvider(config.endpoint);
    default:
      console.warn(`Unknown provider "${config.provider}", falling back to OpenRouter`);
      return new OpenAICompatibleProvider(PROVIDER_ENDPOINTS.openrouter);
  }
}

const MAX_RETRIES = 3;

export async function reviewArticleSection(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens?: number,
): Promise<string> {
  assertFreeModelAllowed(config);
  const provider = getProvider(config);
  console.log(`[AI Review] Starting review with provider="${config.provider}" model="${config.model}"`);
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`AI request attempt ${attempt}/${MAX_RETRIES}...`);
    try {
      const result = await provider.chatCompletion({
        apiKey: config.apiKey,
        model: config.model,
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        ...(maxTokens ? { maxTokens } : {}),
      });
      console.log(`[AI Review] Successfully received response from ${config.provider} (${config.model})`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `AI request attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`,
      );
      if (attempt < MAX_RETRIES)
        await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  throw lastError;
}

export async function generateRevisionSummary(
  config: LLMConfig,
  oldText: string,
  newText: string,
): Promise<string> {
  try {
    assertFreeModelAllowed(config);
    const provider = getProvider(config);
    console.log(`[AI Summary] Generating summary with provider="${config.provider}" model="${config.model}"`);
    const summary = await provider.chatCompletion({
      apiKey: config.apiKey,
      model: config.model,
      systemPrompt:
        'You summarise text edits in 3-7 words as a lowercase verb phrase. ' +
        'Examples: "translated introduction", "improved grammar and clarity", ' +
        '"expanded lead section", "fixed wikitext formatting". ' +
        'Respond with ONLY the phrase, no punctuation.',
      userPrompt: `BEFORE:\n${oldText.slice(0, 800)}\n\nAFTER:\n${newText.slice(0, 800)}`,
      temperature: 0,
      maxTokens: 20,
    });
    return summary.toLowerCase();
  } catch {
    return 'reviewed article';
  }
}
