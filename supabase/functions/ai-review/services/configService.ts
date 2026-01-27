import createSupabaseClient from '../../_shared/supabaseClient.ts';
import { LLMConfig } from '../utils/types.ts';
import { defaultAiPrompt, buildJsonEnforcement } from '../config/prompts.ts';

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
): Promise<LLMConfig | null> {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('llm_reviewer_config')
      .eq('id', userId)
      .single();

    let apiKey: string | null = null;
    let prompt: string = defaultAiPrompt;
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

      if (config.prompt?.trim()) {
        const jsonEnforcementSuffix = buildJsonEnforcement();
        prompt = config.prompt + jsonEnforcementSuffix;
        console.log('Using user custom prompt with JSON array enforcement');
      }

      if (config.model) {
        model = config.model;
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

    return {
      apiKey,
      prompt,
      model,
      hasUserConfig,
    };
  } catch (error) {
    console.error('Error getting LLM config:', error);
    return null;
  }
}
