import { Hono } from 'npm:hono@4.7.4';
import { corsMiddleware } from '../_shared/middleware/cors.ts';
import createSupabaseClient from '../_shared/supabaseClient.ts';
import {
  addMiraBotPermission,
  getArticle,
} from '../_shared/helpers/supabaseHelper.ts';
import MediawikiClient from '../_shared/mediawikiAPI/MediawikiClient.ts';
import wikipediaApi from '../_shared/wikipedia/WikipediaApi.ts';

const functionName = 'ai-review';
const app = new Hono().basePath(`/${functionName}`);

async function getMiraBotId(
  supabaseClient: ReturnType<typeof createSupabaseClient>
) {
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

const defaultAiPrompt = `**Prompt for Mira (Wikipedia Editing Assistant):**

You are Mira, a Wikipedia editing assistant. You will receive one paragraph at a time (in MediaWiki markup). Your role is to review the **content only**, focusing on three aspects:

1. **Readability** - clarity, grammar, logical flow.
2. **Eloquence** - concise, neutral, and smooth phrasing.
3. **Wikipedia Eligibility Criteria** -

   * **Neutral Point of View (NPOV):** No bias, promotion, or subjective judgments.
   * **Verifiability:** Wording must allow support by reliable, published sources.
   * **Encyclopedic Style:** Formal, factual, impersonal tone.

**Response format:** Always reply in JSON with two fields:

json
{
  "comment": "A brief and kind note on whether a change helps or not.",
  "proposed_change": "The smallest necessary modification to the paragraph, or 'No changes needed.'"
}

Guidelines:

* Keep comments **very short and supportive**.
* Always suggest the **minimalist change** needed, never over-edit.
* If the paragraph is fine, still return JSON with a positive comment and "No changes needed."
* **Less is more. Stay concise. Focus on meaning, not formatting.**

If no change is needed, Mira must still return this JSON format with a positive comment and "No changes needed." Less is more, be as concise as possible`;

app.use('*', corsMiddleware);

interface AIResponse {
  comment: string;
  proposed_change: string;
}

interface OpenRouterChoice {
  message?: { content?: string };
  text?: string;
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
}

interface LLMConfig {
  apiKey: string;
  prompt: string;
  model: string;
  hasUserConfig: boolean;
}

function parseAIResponse(
  content: string | null | undefined
): AIResponse | null {
  if (!content || typeof content !== 'string') return null;

  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/{[\s\S]*}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function validateAIResponse(data: OpenRouterResponse): AIResponse | null {
  try {
    const choice = data?.choices?.[0];
    const content = choice?.message?.content ?? choice?.text ?? null;

    const parsed = parseAIResponse(content);

    if (
      !parsed ||
      typeof parsed.comment !== 'string' ||
      typeof parsed.proposed_change !== 'string'
    ) {
      return null;
    }

    return {
      comment: parsed.comment.trim(),
      proposed_change: parsed.proposed_change.trim(),
    };
  } catch {
    return null;
  }
}

function getWikitextContext(
  currentWikitext: string,
  changeIndex: number
): string {
  try {
    const sections = currentWikitext.split(/\n\n+/);

    const startIdx = Math.max(0, changeIndex - 1);
    const endIdx = Math.min(sections.length - 1, changeIndex + 1);

    const contextSections = [];
    for (let i = startIdx; i <= endIdx; i++) {
      if (sections[i]) {
        contextSections.push(sections[i].trim());
      }
    }
    return contextSections.join('\n\n');
  } catch (error) {
    console.error('Error extracting wikitext context:', error);
    return '';
  }
}

function getWikitextSegment(
  currentWikitext: string,
  changeIndex: number
): string {
  try {
    const sections = currentWikitext.split(/\n\n+/);

    if (changeIndex >= 0 && changeIndex < sections.length) {
      return sections[changeIndex].trim();
    }
    return '';
  } catch (error) {
    console.error('Error extracting wikitext segment:', error);
    return '';
  }
}

async function getLLMConfig(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string
): Promise<LLMConfig | null> {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('llm_reviewer_config')
      .eq('id', userId)
      .single();

    if (profileError || !profileData?.llm_reviewer_config) {
      console.log('User has no LLM config, checking environment fallback');
      return getEnvironmentLLMConfig();
    }

    const config = profileData.llm_reviewer_config;

    if (!config.has_api_key) {
      console.log('User has no API key, using environment fallback');
      return getEnvironmentLLMConfig();
    }

    const { data: apiKey, error: keyError } = await supabase.rpc(
      'get_user_api_key',
      { user_id_param: userId }
    );

    if (keyError || !apiKey) {
      console.error(
        'Error fetching user API key, using environment fallback:',
        keyError
      );
      return getEnvironmentLLMConfig();
    }

    return {
      apiKey,
      prompt: config.prompt || defaultAiPrompt,
      model: config.model || Deno.env.get('AI_MODEL'),
      hasUserConfig: true,
    };
  } catch (error) {
    console.error(
      'Error getting  LLM config, using environment fallback:',
      error
    );
    return getEnvironmentLLMConfig();
  }
}

function getEnvironmentLLMConfig(): LLMConfig | null {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    console.error('No environment API key configured');
    return null;
  }

  const model = Deno.env.get('AI_MODEL') as string;

  return {
    apiKey,
    prompt: defaultAiPrompt,
    model,
    hasUserConfig: false,
  };
}

function buildArticleContext(
  title: string,
  description: string | null
): string {
  let context = 'Here is the article title and description:\n\n';
  context += `Title: ${title}\n`;

  if (description?.trim()) {
    context += `Description: ${description}\n`;
  } else {
    context += 'Description: (No description provided)\n';
  }

  return context;
}

function getEditTypeName(typeOfEdit: number | null | undefined): string {
  const types: Record<number, string> = {
    0: 'CHANGE',
    1: 'INSERT',
    2: 'DELETE',
    4: 'DELETE-INSERT',
  };
  return types[typeOfEdit ?? -1] || 'UNKNOWN';
}

app.post('/', async (c) => {
  try {
    console.log('AI Review started');
    const { article_id } = await c.req.json();
    if (!article_id) return c.json({ error: 'Missing article_id' }, 400);
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const supabase = createSupabaseClient(authHeader);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const MIRA_BOT_ID = await getMiraBotId(supabase);

    if (!MIRA_BOT_ID) return c.json({ error: 'Mira bot not configured' }, 500);

    if (user.id === MIRA_BOT_ID) {
      return c.json({ error: 'Mira cannot review her own changes' }, 403);
    }
    await addMiraBotPermission(article_id);
    const article = await getArticle(article_id);
    if (!article) return c.json({ error: 'Article not found' }, 404);

    const userId = user.id;
    const LLMConfig = await getLLMConfig(supabase, userId);
    if (!LLMConfig) {
      return c.json(
        {
          error:
            'No AI API key configured. Please configure environment variables or set up your API key in Account Settings.',
        },
        400
      );
    }

    const configSource = LLMConfig.hasUserConfig ? 'user' : 'environment';
    console.log(`Using ${configSource} LLM config - Model: ${LLMConfig.model}`);

    const articleContext = buildArticleContext(
      article.title,
      article.description
    );
    console.log('Article context prepared:', articleContext);

    const { data: latestRevision } = await supabase
      .from('revisions')
      .select('id, revid')
      .eq('article_id', article_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestRevision) return c.json({ error: 'No revision found' }, 500);

    const { data: changes } = await supabase
      .from('changes')
      .select('id, type_of_edit, index')
      .eq('revision_id', latestRevision.id)
      .neq('contributor_id', MIRA_BOT_ID)
      .eq('archived', false)
      .order('index', { ascending: true });

    if (!changes?.length) return c.json({ summary: 'No changes to review' });

    console.log(`Reviewing ${changes.length} changes`);

    const mediawiki = new MediawikiClient(article.language, wikipediaApi);
    const currentWikitext = await mediawiki.getCurrentArticleWikitext(
      article_id
    );

    const wikitextSegments = new Map<string, string>();
    console.log('Extracting wikitext segments from latest revision...');

    for (const ch of changes) {
      const segment = getWikitextSegment(currentWikitext, ch.index);
      if (segment) {
        wikitextSegments.set(ch.id, segment);
        console.log(
          `  Change at index ${ch.index}: extracted ${segment.length} chars`
        );
      } else {
        console.warn(
          `  Change at index ${ch.index}: could not extract segment`
        );
      }
    }

    const reviews = [];
    const changesToApply: Array<{
      original: string;
      improved: string;
      comment: string;
    }> = [];

    const reviewPromises = changes.map(async (ch, i) => {
      const wikitextSegment = wikitextSegments.get(ch.id);

      if (!wikitextSegment) {
        console.warn(
          `No wikitext segment found for change ${ch.id} at index ${ch.index}`
        );
        return {
          change_id: ch.id,
          comment: 'Could not locate change in wikitext',
          proposed_change: 'No changes needed.',
          has_improvement: false,
        };
      }
      const changeWikitext = wikitextSegment.slice(0, 4000);

      if (!changeWikitext) {
        return {
          change_id: ch.id,
          comment: 'Empty content',
          proposed_change: 'No changes needed.',
          has_improvement: false,
        };
      }

      const wikitextContext = getWikitextContext(currentWikitext, ch.index);
      console.log(`  Context length: ${wikitextContext.length}`);

      const editType = getEditTypeName(ch.type_of_edit);

      let prompt = `${articleContext}\n\nEdit Type: ${editType}\n\n`;

      if (wikitextContext && wikitextContext.length > 0) {
        prompt += `Context from article:\n---\n${wikitextContext}\n---\n\n`;
      }

      prompt += `Content to review:\n${changeWikitext}`;

      try {
        const resp = await fetch(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${LLMConfig.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: LLMConfig.model,
              messages: [
                { role: 'system', content: LLMConfig.prompt },
                { role: 'user', content: prompt },
              ],
              max_tokens: 600,
              temperature: 0.3,
            }),
          }
        );

        if (!resp.ok) {
          return {
            change_id: ch.id,
            comment: `API error ${resp.status}`,
            proposed_change: 'No changes needed.',
            has_improvement: false,
          };
        }

        const data: OpenRouterResponse = await resp.json();
        const validated = validateAIResponse(data);

        if (!validated) {
          console.error(`Invalid AI response for change ${ch.id}`);
          return {
            change_id: ch.id,
            comment: 'Invalid AI response',
            proposed_change: 'No changes needed.',
            has_improvement: false,
          };
        }

        const { comment, proposed_change } = validated;

        const hasImprovement =
          proposed_change !== 'No changes needed.' &&
          proposed_change !== wikitextSegment &&
          proposed_change.trim() !== wikitextSegment.trim() &&
          proposed_change.length > 0;

        if (hasImprovement) {
          console.log(`Improvement found for change ${i + 1}`);
        }

        return {
          change_id: ch.id,
          comment,
          proposed_change,
          has_improvement: hasImprovement,
          original: wikitextSegment,
          improved: proposed_change,
        };
      } catch (error) {
        console.error(`Error processing change ${ch.id}:`, error);
        return {
          change_id: ch.id,
          comment: 'Processing error',
          proposed_change: 'No changes needed.',
          has_improvement: false,
        };
      }
    });

    const reviewResults = await Promise.all(reviewPromises);

    for (const result of reviewResults) {
      reviews.push({
        change_id: result.change_id,
        comment: result.comment,
        proposed_change: result.has_improvement
          ? result.proposed_change
          : 'No changes needed.',
        has_improvement: result.has_improvement,
      });

      if (result.has_improvement && result.original && result.improved) {
        changesToApply.push({
          original: result.original,
          improved: result.improved,
          comment: result.comment,
        });
      }
    }

    if (changesToApply.length === 0) {
      console.log('No improvements needed');
      return c.json({
        summary: `Mira reviewed ${changes.length} change(s). No improvements needed.`,
        total_reviewed: changes.length,
        total_improvements: 0,
        reviews,
        trigger_diff_update: false,
      });
    }

    console.log(
      `Applying ${changesToApply.length} improvements to current wikitext`
    );

    let improvedWikitext = currentWikitext;
    let appliedCount = 0;

    for (const change of changesToApply) {
      if (improvedWikitext.includes(change.original)) {
        improvedWikitext = improvedWikitext.replace(
          change.original,
          change.improved
        );
        appliedCount++;
      }
        //improvedWikitext += `\n\n${change.improved}`;
    }

    console.log(
      `Successfully applied ${appliedCount}/${changesToApply.length} improvements`
    );

    const summaryText = `Mira: ${changesToApply.length} improvement(s)`;

    console.log('Creating NEW revision in MediaWiki as AI bot');
    const editResult = await mediawiki.editArticleAsBot(
      article_id,
      improvedWikitext,
      summaryText
    );

    console.log('NEW revision created successfully!');
    console.log(`  Old revision: ${editResult.oldrevid}`);
    console.log(`  New revision: ${editResult.newrevid}`);

    const summaryMessage = LLMConfig.hasUserConfig
      ? `Mira applied ${changesToApply.length} improvement(s) using user's LLM settings`
      : `Mira applied ${changesToApply.length} improvement(s)`;

    return c.json({
      summary: summaryMessage,
      total_reviewed: changes.length,
      total_improvements: changesToApply.length,
      mira_bot_id: MIRA_BOT_ID,
      old_revision: editResult.oldrevid,
      new_revision: editResult.newrevid,
      reviews,
      trigger_diff_update: true,
      config_source: configSource,
    });
  } catch (err) {
    console.error('Unexpected error during AI review:', err);
    console.error(
      'Error stack:',
      err instanceof Error ? err.stack : 'No stack trace'
    );
    return c.json(
      {
        error: 'Unexpected error during AI review',
        details: String(err),
      },
      500
    );
  }
});

Deno.serve((req) => app.fetch(req));
