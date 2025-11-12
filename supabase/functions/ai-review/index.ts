import { Hono } from 'hono';
import { corsMiddleware } from '../_shared/middleware/cors.ts';
import createSupabaseAdmin from '../_shared/supabaseAdmin.ts';
import createSupabaseClient from '../_shared/supabaseClient.ts';
import { getArticle } from '../_shared/helpers/supabaseHelper.ts';
import MediawikiClient from './MediawikiClient.ts';
import wikipediaApi from '../_shared/wikipedia/WikipediaApi.ts';

const functionName = 'ai-review';
const app = new Hono().basePath(`/${functionName}`);

async function getMiraBotId(
  supabaseAdmin: ReturnType<typeof createSupabaseAdmin>
) {
  const botEmail = 'mira@wikiadviser.io';

  const { data, error } = await supabaseAdmin
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

const aiPrompt = `You are Mira, a Wikipedia editing assistant. You will receive one paragraph at a time (in MediaWiki markup). Your role is to review the content only, focusing on three aspects:

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

function extractWikitext(content: string): string {
  if (!content) return '';
  return content
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findWikitextMatch(contentText: string, fullWikitext: string): string {
  const searchText = contentText.substring(0, 100).trim();

  for (const line of fullWikitext.split('\n')) {
    const lineClean = line.trim();
    if (lineClean && searchText.includes(lineClean.substring(0, 50))) {
      return line;
    }
  }

  for (const para of fullWikitext.split('\n\n')) {
    if (para.includes(searchText.substring(0, 50))) {
      return para.trim();
    }
  }

  return contentText;
}

app.post('/', async (c) => {
  try {
    console.log('AI Review started');
    const { article_id } = await c.req.json();

    if (!article_id) return c.json({ error: 'Missing article_id' }, 400);

    const supabaseAdmin = createSupabaseAdmin();
    const MIRA_BOT_ID = await getMiraBotId(supabaseAdmin);

    if (!MIRA_BOT_ID) return c.json({ error: 'Mira bot not configured' }, 500);

    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      const userClient = createSupabaseClient(authHeader);
      const {
        data: { user },
      } = await userClient.auth.getUser();
      if (user?.id === MIRA_BOT_ID) {
        return c.json({ error: 'Mira cannot review her own changes' }, 403);
      }
    }

    const article = await getArticle(article_id);
    if (!article) return c.json({ error: 'Article not found' }, 404);

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) return c.json({ error: 'No AI API key configured' }, 500);

    const aiModel = Deno.env.get('AI_MODEL');

    const { data: latestRevision } = await supabaseAdmin
      .from('revisions')
      .select('id, revid')
      .eq('article_id', article_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestRevision) return c.json({ error: 'No revision found' }, 500);

    const { data: changes } = await supabaseAdmin
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
    console.log(`Current wikitext length: ${currentWikitext.length}`);

    const reviews = [];
    const changesToApply: Array<{
      original: string;
      improved: string;
      comment: string;
    }> = [];

    for (let i = 0; i < changes.length; i++) {
      const ch = changes[i];
      const contentText = extractWikitext(ch.content);

      if (!contentText) {
        reviews.push({
          change_id: ch.id,
          comment: 'Empty content',
          proposed_change: 'No changes needed.',
          has_improvement: false,
        });
        continue;
      }

      const changeWikitext = findWikitextMatch(contentText, currentWikitext);

      let editType = 'MODIFICATION';
      if (ch.type_of_edit === 0) editType = 'DELETION';
      else if (ch.type_of_edit === 1) editType = 'ADDITION';

      console.log(`Processing change ${i + 1}/${changes.length} (${editType})`);

      const prompt = `Edit Type: ${editType}\n\nContent to review:\n${changeWikitext}`;

      const resp = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: aiModel,
            messages: [
              { role: 'system', content: aiPrompt },
              { role: 'user', content: prompt },
            ],
            max_tokens: 500,
            temperature: 0.3,
          }),
        }
      );

      if (!resp.ok) {
        reviews.push({
          change_id: ch.id,
          comment: `API error ${resp.status}`,
          proposed_change: 'No changes needed.',
          has_improvement: false,
        });
        continue;
      }

      const data: OpenRouterResponse = await resp.json();
      const validated = validateAIResponse(data);

      if (!validated) {
        console.error(`Invalid AI response for change ${ch.id}`);
        reviews.push({
          change_id: ch.id,
          comment: 'Invalid AI response',
          proposed_change: 'No changes needed.',
          has_improvement: false,
        });
        continue;
      }

      const { comment, proposed_change } = validated;

      const hasImprovement =
        proposed_change !== 'No changes needed.' &&
        proposed_change !== changeWikitext &&
        proposed_change.trim() !== changeWikitext.trim() &&
        proposed_change.length > 0;

      if (hasImprovement) {
        changesToApply.push({
          original: changeWikitext,
          improved: proposed_change,
          comment,
        });
        console.log(`Improvement found for change ${i + 1}`);
      }

      reviews.push({
        change_id: ch.id,
        comment,
        proposed_change: hasImprovement
          ? proposed_change
          : 'No changes needed.',
        has_improvement: hasImprovement,
      });

      await new Promise((res) => setTimeout(res, 300));
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

    console.log(`Applying ${changesToApply.length} improvements`);

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
        const normalizedOriginal = change.original.replace(/\s+/g, ' ').trim();
        const escapedOriginal = normalizedOriginal.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );
        const regex = new RegExp(escapedOriginal, 'g');
        if (regex.test(improvedWikitext)) {
          improvedWikitext = improvedWikitext.replace(regex, change.improved);
          appliedCount++;
        } else {
          console.warn(`Could not find original text: ${change.comment}`);
        }
      }
    }

    if (appliedCount === 0) {
      console.log('Could not apply any improvements');
      return c.json({
        summary: 'Mira could not apply improvements to article.',
        total_reviewed: changes.length,
        total_improvements: 0,
        reviews,
        trigger_diff_update: false,
      });
    }

    console.log(
      `Applied ${appliedCount}/${changesToApply.length} improvements`
    );

    const summaryText = `Mira: ${appliedCount} improvement(s)`;
    const editResult = await mediawiki.editArticleAsBot(
      article_id,
      improvedWikitext,
      summaryText
    );

    console.log(`New revision created: ${editResult.newrevid}`);

    return c.json({
      summary: `Mira reviewed ${changes.length} change(s) and applied ${appliedCount} improvement(s).`,
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
