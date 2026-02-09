import createSupabaseClient from '../../_shared/supabaseClient.ts';
import { LLMConfig, ArticleContext } from '../utils/types.ts';
import { defaultAiPrompt } from '../config/prompts.ts';

export async function getMiraBotId(
  supabaseClient: ReturnType<typeof createSupabaseClient>,
): Promise<string | null> {
  const botEmail = Deno.env.get('AI_BOT_EMAIL');
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('email', botEmail)
    .maybeSingle();

  if (error) {
    console.error('Error fetching Mira bot ID:', error);
    return null;
  }
  return data?.id ?? null;
}

export async function getLLMConfig(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  articleContext: ArticleContext,
  customPromptText?: string,
): Promise<LLMConfig | null> {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('llm_reviewer_config')
      .eq('id', userId)
      .single();

    let apiKey: string | null = null;
    const basePrompt: string = defaultAiPrompt;
    let model: string = Deno.env.get('AI_MODEL') ?? 'openai/gpt-3.5-turbo';
    let hasUserConfig = false;

    if (!profileError && profileData?.llm_reviewer_config) {
      const config = profileData.llm_reviewer_config;

      if (config.has_api_key) {
        const { data: userApiKey, error: keyError } = await supabase.rpc(
          'get_user_api_key',
          { user_id_param: userId },
        );

        if (!keyError && userApiKey) {
          apiKey = userApiKey;
          hasUserConfig = true;
          console.log('Using user API key');
        }
      }

      if (config.model) {
        model = config.model;
        console.log(`Using user model: ${model}`);
      }
    }
    if (!apiKey) {
      apiKey = Deno.env.get('OPENROUTER_API_KEY') ?? null;
      console.log('Using environment API key');
    }

    if (!apiKey) {
      console.error('No API key available');
      return null;
    }

    let finalPrompt: string;

    if (customPromptText?.trim()) {
      console.log('Applying custom prompt instructions');

      const contextBlock = `**ARTICLE CONTEXT:**
You are reviewing changes for the article: "${articleContext.title}"${
        articleContext.description
          ? `\nDescription: ${articleContext.description}`
          : ''
      }

`;

      console.log('Generated context block:', contextBlock);

      finalPrompt = `You are Mira, a Wikipedia editing assistant.

${contextBlock}**CRITICAL: You MUST respond with ONLY a JSON array. No explanations, no preamble, no markdown code blocks. Just the JSON array.**

You will receive multiple changes to review. For EACH change, you must follow these instructions:

**YOUR PRIMARY TASK:**
${customPromptText}

**IMPORTANT:** When following the above instructions:
- If the instruction asks you to translate, modify, add, or change content, you MUST set has_changes to TRUE
- If the instruction asks you to improve, rewrite, or transform content, you MUST set has_changes to TRUE
- Put the result of following the instruction in proposed_change
- Only set has_changes to FALSE if you genuinely cannot improve or modify the content as instructed

**Response format - ONLY JSON ARRAY:**
Return an array of objects, one per change:
[
  {
    "change_index": 0,
    "has_changes": true or false,
    "comment": "Brief explanation of what you did",
    "proposed_change": "The modified/translated/improved text (empty string only if has_changes is false)"
  }
]

**Rules:**
- Return ONLY the JSON array, nothing else
- No markdown blocks like \`\`\`json
- Include ALL changes in order (use change_index to match)
- Set has_changes to TRUE when you apply your instructions
- Leave proposed_change as empty string ONLY when has_changes is false`;
    } else {
      console.log('Using default prompt (no custom instructions)');
      const contextBlock = `**ARTICLE CONTEXT:**
You are reviewing changes for the article: "${articleContext.title || 'Untitled Article'}"${
        articleContext.description
          ? `\nDescription: ${articleContext.description}`
          : ''
      }

`;

      finalPrompt = `You are Mira, a Wikipedia editing assistant.

${contextBlock}${basePrompt.replace('You are Mira, a Wikipedia editing assistant.\n\n', '')}`;

      console.log(finalPrompt);
    }

    return {
      apiKey,
      prompt: finalPrompt,
      model,
      hasUserConfig,
    };
  } catch (error) {
    console.error('Error getting LLM config:', error);
    return null;
  }
}
