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

const defaultAiPrompt = `You are Mira, a Wikipedia editing assistant.

**CRITICAL: You MUST respond with ONLY a JSON object. No explanations, no preamble, no markdown code blocks. Just the JSON.**

Example valid response:
{"comment": "Fixed grammar", "proposed_change": "The corrected text here"}

You will receive MediaWiki markup. Review for:
1. **Readability** - clarity, grammar, logical flow
2. **Eloquence** - concise, neutral, and smooth phrasing
3. **Wikipedia Eligibility Criteria** - NPOV, verifiability, encyclopedic style

**Language rules (CRITICAL):**
- **NEVER translate the text**
- **Keep original language exactly as provided**
- Fix only grammar/spelling/clarity within the same language
- **No translation under any circumstances**

**Response format - ONLY JSON (no markdown, no code blocks):**
{
  "comment": "Brief supportive note on improvements (max 100 characters)",
  "proposed_change": "Modified text in original language OR 'No changes needed.'"
}

**Rules:**
- Return ONLY the JSON object, nothing else
- No markdown blocks like \`\`\`json
- No preamble or explanations
- If no changes needed: {"comment": "Looks good", "proposed_change": "No changes needed."}
- Make minimal necessary changes only
- Keep concise and focused`;

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

  let cleaned = content.trim();

  cleaned = cleaned
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  if (parsed.comment && parsed.proposed_change) {
    return {
      comment: String(parsed.comment).trim(),
      proposed_change: String(parsed.proposed_change).trim(),
    };
  }

  const jsonMatch = cleaned.match(
    /\{[\s\S]*"comment"[\s\S]*"proposed_change"[\s\S]*\}/
  );
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.comment && parsed.proposed_change) {
      return {
        comment: String(parsed.comment).trim(),
        proposed_change: String(parsed.proposed_change).trim(),
      };
    }
  }

  const commentMatch = cleaned.match(/"comment"\s*:\s*"([^"]+)"/);
  const changeMatch = cleaned.match(
    /"proposed_change"\s*:\s*"([^"]*(?:\\"[^"]*)*?)"/
  );

  if (commentMatch && changeMatch) {
    return {
      comment: commentMatch[1].trim(),
      proposed_change: changeMatch[1].trim(),
    };
  }

  return {
    comment: cleaned.substring(0, 500),
    proposed_change: 'No changes needed.',
  };
}

function validateAIResponse(data: OpenRouterResponse): AIResponse | null {
  try {
    const choice = data?.choices?.[0];
    const content = choice?.message?.content ?? choice?.text ?? null;

    if (!content) {
      console.error('No content in AI response:', JSON.stringify(data));
      return null;
    }

    const parsed = parseAIResponse(content);

    if (!parsed) {
      console.error('Failed to parse AI response. Raw content:', content);
      return null;
    }

    if (
      typeof parsed.comment !== 'string' ||
      typeof parsed.proposed_change !== 'string'
    ) {
      console.error('Invalid field types in parsed response:', parsed);
      return null;
    }

    console.log('Successfully parsed AI response:', {
      comment_length: parsed.comment.length,
      has_changes: parsed.proposed_change !== 'No changes needed.',
    });

    return {
      comment: parsed.comment.trim(),
      proposed_change: parsed.proposed_change.trim(),
    };
  } catch (error) {
    console.error('Error in validateAIResponse:', error);
    return null;
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

function getEditTypeName(changeType: 'insert' | 'delete' | 'change'): string {
  const types: Record<string, string> = {
    insert: 'INSERT',
    delete: 'DELETE',
    change: 'CHANGE',
  };
  return types[changeType] || 'UNKNOWN';
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
    console.log('Article context prepared');

    // CHANGED: Fetch revisions directly from MediaWiki instead of PostgreSQL
    const mediawiki = new MediawikiClient(article.language, wikipediaApi);

    console.log('Fetching recent revisions from MediaWiki...');
    const revisions = await mediawiki.getRecentRevisions(article_id, 2);

    if (revisions.length === 0) {
      return c.json({ error: 'No revisions found' }, 404);
    }

    const latestRevision = revisions[0];
    const parentRevision = revisions[1] || revisions[0]; 

    console.log(
      `Latest revision: ${latestRevision.revid}`
    );
    console.log(`Parent revision: ${parentRevision.revid}`);

    if (latestRevision.revid === parentRevision.revid) {
      console.log(
        'This is the first revision, using it as both context and content'
      );
    }

    console.log('Fetching wikitext for both revisions...');
    const [parentWikitext, latestWikitext] = await Promise.all([
      mediawiki.getArticleWikitextAtRevision(article_id, parentRevision.revid),
      mediawiki.getArticleWikitextAtRevision(article_id, latestRevision.revid),
    ]);

    console.log(`Parent wikitext: ${parentWikitext.length} chars`);
    console.log(`Latest wikitext: ${latestWikitext.length} chars`);

    console.log('Computing diff between revisions...');
    const changes = await mediawiki.getRevisionDiff(
      article_id,
      parentRevision.revid,
      latestRevision.revid
    );

    if (!changes || changes.length === 0) {
      return c.json({
        summary: 'No changes to review between revisions',
        trigger_diff_update: false,
      });
    }

    console.log(`Found ${changes.length} changes to review`);

    const reviews = [];
    const changesToApply: Array<{
      original: string;
      improved: string;
      comment: string;
    }> = [];

    const reviewPromises = changes.map(async (change, i) => {
      const editType = getEditTypeName(change.type);

      let prompt = `${articleContext}\n\nEdit Type: ${editType}\n\n`;

      // Add context if available
      if (change.context && change.context.trim()) {
        prompt += `Article context (surrounding paragraphs):\n---\n${change.context}\n---\n\n`;
      }

      // Build prompt based on change type
      if (change.type === 'delete') {
        prompt += `User deleted this content:\n${change.oldText}\n\n`;
        prompt += `Should this deletion be kept, or should some content be restored?`;
      } else if (change.type === 'insert') {
        prompt += `User added this new content:\n${change.newText}\n\n`;
        prompt += `Review this addition for quality and suggest improvements if needed.`;
      } else if (change.type === 'change') {
        prompt += `User made this change:\n`;
        prompt += `BEFORE: ${change.oldText}\n\n`;
        prompt += `AFTER: ${change.newText}\n\n`;
        prompt += `Review this change and suggest improvements if needed.`;
      }

      try {
        console.log(
          `Reviewing change ${i + 1}/${changes.length} (type: ${change.type})`
        );

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
          console.error(`LLM API error for change ${i + 1}: ${resp.status}`);
          return {
            index: i,
            comment: `API error ${resp.status}`,
            proposed_change: 'No changes needed.',
            has_improvement: false,
            change_type: change.type,
          };
        }

        const data: OpenRouterResponse = await resp.json();
        const validated = validateAIResponse(data);

        if (!validated) {
          console.error(`Invalid AI response for change ${i + 1}`);
          return {
            index: i,
            comment: 'Invalid AI response',
            proposed_change: 'No changes needed.',
            has_improvement: false,
            change_type: change.type,
          };
        }

        const { comment, proposed_change } = validated;

        const contentToCompare =
          change.type === 'delete' ? change.oldText : change.newText;

        const hasImprovement =
          proposed_change !== 'No changes needed.' &&
          proposed_change !== contentToCompare &&
          proposed_change.trim() !== contentToCompare.trim() &&
          proposed_change.length > 0;

        if (hasImprovement) {
          console.log(`  ✓ Improvement found for change ${i + 1}`);
        } else {
          console.log(`  - No improvement needed for change ${i + 1}`);
        }

        return {
          index: i,
          comment,
          proposed_change,
          has_improvement: hasImprovement,
          original: contentToCompare,
          improved: proposed_change,
          change_type: change.type,
        };
      } catch (error) {
        console.error(`Error processing change ${i + 1}:`, error);
        return {
          index: i,
          comment: 'Processing error',
          proposed_change: 'No changes needed.',
          has_improvement: false,
          change_type: change.type,
        };
      }
    });

    const reviewResults = await Promise.all(reviewPromises);

    for (const result of reviewResults) {
      reviews.push({
        index: result.index,
        comment: result.comment,
        proposed_change: result.has_improvement
          ? result.proposed_change
          : 'No changes needed.',
        has_improvement: result.has_improvement,
        change_type: result.change_type,
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
      `Applying ${changesToApply.length} improvements to latest wikitext`
    );

    let improvedWikitext = latestWikitext;
    let appliedCount = 0;

    for (const change of changesToApply) {
      if (improvedWikitext.includes(change.original)) {
        improvedWikitext = improvedWikitext.replace(
          change.original,
          change.improved
        );
        appliedCount++;
      } else {
        console.warn('Could not find original text in wikitext to replace');
      }
      //improvedWikitext += `\n\n${change.improved}`;
    }

    console.log(
      `Successfully applied ${appliedCount}/${changesToApply.length} improvements`
    );

    if (appliedCount === 0) {
      console.log('No improvements could be applied (text not found)');
      return c.json({
        summary: `Mira reviewed ${changes.length} changes but could not apply improvements`,
        total_reviewed: changes.length,
        total_improvements: 0,
        reviews,
        trigger_diff_update: false,
      });
    }

    const summaryText = `Mira: improved ${appliedCount} change(s)`;

    console.log('Creating new revision in MediaWiki as AI bot');
    const editResult = await mediawiki.editArticleAsBot(
      article_id,
      improvedWikitext,
      summaryText
    );

    console.log('NEW revision created successfully!');
    console.log(`  Old revision: ${editResult.oldrevid}`);
    console.log(`  New revision: ${editResult.newrevid}`);

    const summaryMessage = LLMConfig.hasUserConfig
      ? `Mira applied ${appliedCount} improvement(s) using user's LLM settings`
      : `Mira applied ${appliedCount} improvement(s)`;

    return c.json({
      summary: summaryMessage,
      total_reviewed: changes.length,
      total_improvements: appliedCount,
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
