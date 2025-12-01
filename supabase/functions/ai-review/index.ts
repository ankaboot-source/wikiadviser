import { Hono } from 'hono';
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
  const botEmail = 'mira@wikiadviser.io';
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

const defaultAiPrompt = `You are Mira, a Wikipedia editing assistant. You will receive one paragraph at a time (in MediaWiki markup). Your role is to review the content only, focusing on three aspects:

1. Readability – clarity, grammar, logical flow.
2. Eloquence – concise, neutral, and smooth phrasing.
3. Wikipedia Eligibility Criteria – NPOV, verifiability, encyclopedic style.

Response format: Always reply in JSON with two fields:
{
  "comment": "A brief and kind note on whether a change helps or not.",
  "proposed_change": "The smallest necessary modification to the paragraph, or 'No changes needed.'"
}

Guidelines:
* Keep comments very short and supportive.
* Always suggest the minimalist change needed, never over-edit.
* If the paragraph is fine, still return JSON with a positive comment and "No changes needed."
* DO NOT use HTML tags. Use only MediaWiki markup.
* Make the SMALLEST possible changes - only fix what's necessary.
* Return the COMPLETE improved paragraph, not just the changed part.`;

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

interface OwnerLLMConfig {
  apiKey: string;
  prompt: string;
  model: string;
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

function getChangeWikitext(
  currentWikitext: string,
  changeIndex: number
): string {
  try {
    const sections = currentWikitext.split(/\n\n+/);

    if (changeIndex >= 0 && changeIndex < sections.length) {
      return sections[changeIndex].trim();
    }

    return currentWikitext.slice(0, 4000);
  } catch (error) {
    console.error('Error extracting change wikitext:', error);
    return '';
  }
}

async function getLLMConfigOwner(
  supabase: ReturnType<typeof createSupabaseClient>,
  ownerId: string
): Promise<OwnerLLMConfig | null> {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('llm_reviewer_config')
      .eq('id', ownerId)
      .single();

    if (profileError || !profileData?.llm_reviewer_config) {
      console.log('Owner has no LLM config');
      return null;
    }

    const config = profileData.llm_reviewer_config;

    if (!config.has_api_key || !config.model) {
      console.log('Owner LLM config incomplete');
      return null;
    }

    const { data: apiKey, error: keyError } = await supabase.rpc(
      'get_user_api_key',
      { user_id_param: ownerId }
    );

    if (keyError || !apiKey) {
      console.error('Error fetching owner API key:', keyError);
      return null;
    }

    return {
      apiKey: apiKey,
      prompt: config.prompt || defaultAiPrompt,
      model: config.model,
    };
  } catch (error) {
    console.error('Error getting owner LLM config:', error);
    return null;
  }
}

async function getArticleOwner(
  supabase: ReturnType<typeof createSupabaseClient>,
  articleId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('user_id')
      .eq('article_id', articleId)
      .eq('role', 'owner')
      .single();

    if (error || !data) {
      console.error('Error fetching article owner:', error);
      return null;
    }

    return data.user_id;
  } catch (error) {
    console.error('Error getting article owner:', error);
    return null;
  }
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

    const ownerId = await getArticleOwner(supabase, article_id);
    if (!ownerId) {
      return c.json({ error: 'Article owner not found' }, 404);
    }

    const ownerLLMConfig = await getLLMConfigOwner(supabase, ownerId);
    if (!ownerLLMConfig) {
      return c.json(
        {
          error:
            'Article owner has not configured LLM Reviewer Agent. Please set up API key, model, and prompt in Account Settings.',
        },
        400
      );
    }

    console.log(`Using owner's LLM config - Model: ${ownerLLMConfig.model}`);

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
      .select('id, content, type_of_edit, index')
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

    const reviews = [];
    const changesToApply: Array<{
      original: string;
      improved: string;
      comment: string;
    }> = [];

    const reviewPromises = changes.map(async (ch, i) => {
      const changeWikitext = getChangeWikitext(currentWikitext, ch.index);

      if (!changeWikitext) {
        return {
          change_id: ch.id,
          comment: 'Empty content',
          proposed_change: 'No changes needed.',
          has_improvement: false,
        };
      }

      const editType =
        ch.type_of_edit === 0
          ? 'DELETION'
          : ch.type_of_edit === 1
          ? 'ADDITION'
          : 'MODIFICATION';

      console.log(`Processing change ${i + 1}/${changes.length} (${editType})`);

      const prompt = `Edit Type: ${editType}\n\nContent to review:\n${changeWikitext}`;

      try {
        const resp = await fetch(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${ownerLLMConfig.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: ownerLLMConfig.model,
              messages: [
                { role: 'system', content: ownerLLMConfig.prompt },
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
          proposed_change !== changeWikitext &&
          proposed_change.trim() !== changeWikitext.trim() &&
          proposed_change.length > 0;

        if (hasImprovement) {
          console.log(`Improvement found for change ${i + 1}`);
        }

        return {
          change_id: ch.id,
          comment,
          proposed_change,
          has_improvement: hasImprovement,
          original: changeWikitext,
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
      } else {
        console.warn(
          `Could not find original text in wikitext for change: ${change.comment}`
        );
      }
    }

    if (appliedCount === 0) {
      console.log('Could not apply any improvements to wikitext');
      return c.json({
        summary: 'Mira could not apply improvements to article.',
        total_reviewed: changes.length,
        total_improvements: 0,
        reviews,
        trigger_diff_update: false,
      });
    }

    console.log(
      `Successfully applied ${appliedCount}/${changesToApply.length} improvements`
    );

    const summaryText = `Mira: ${appliedCount} improvement(s)`;

    console.log('Creating NEW revision in MediaWiki as AI bot');
    const editResult = await mediawiki.editArticleAsBot(
      article_id,
      improvedWikitext,
      summaryText
    );

    console.log('NEW revision created successfully!');
    console.log(`  Old revision: ${editResult.oldrevid}`);
    console.log(`  New revision: ${editResult.newrevid}`);

    return c.json({
      summary: `Mira applied ${appliedCount} improvement(s) using owner's LLM settings`,
      total_reviewed: changes.length,
      total_improvements: appliedCount,
      mira_bot_id: MIRA_BOT_ID,
      old_revision: editResult.oldrevid,
      new_revision: editResult.newrevid,
      reviews,
      trigger_diff_update: true,
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
