import createSupabaseClient from '../../_shared/supabaseClient.ts';
import createSupabaseAdmin from '../../_shared/supabaseAdmin.ts';
import { LLMConfig, AIProviderType } from '../utils/types.ts';
import { defaultAiPrompt } from '../config/prompts.ts';

export async function getMiraBotId(): Promise<string | null> {
  const botEmail = Deno.env.get('AI_BOT_EMAIL');
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .eq('email', botEmail)
    .maybeSingle();

  if (error) {
    console.error('Error fetching Mira bot ID', error);
    return null;
  }
  if (!data?.id) {
    console.error(`Mira bot not found for email: ${botEmail}`);
    return null;
  }
  return data.id;
}

export async function getLLMConfig(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  customPromptText?: string,
): Promise<LLMConfig | null> {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('llm_reviewer_config')
      .eq('id', userId)
      .single();

    let apiKey: string | null = null;
    let model: string = Deno.env.get('AI_MODEL') ?? 'openrouter/free';
    let provider: AIProviderType = (Deno.env.get('AI_PROVIDER') as AIProviderType) ?? 'openrouter';
    let endpoint: string | null = null;
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
        }
      }

      if (config.model) {
        model = config.model;
      }

      if (config.provider) {
        provider = config.provider as AIProviderType;
      }

      if (config.endpoint) {
        endpoint = config.endpoint;
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

    const finalPrompt = customPromptText?.trim() || defaultAiPrompt;

    console.log(`LLM config resolved: provider="${provider}" model="${model}" hasUserConfig=${hasUserConfig}`);

    return {
      apiKey,
      prompt: finalPrompt,
      model,
      hasUserConfig,
      provider,
      endpoint,
    };
  } catch (error) {
    console.error('Error getting LLM config:', error);
    return null;
  }
}
