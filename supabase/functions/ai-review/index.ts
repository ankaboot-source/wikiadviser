import { Hono } from 'hono';
import { corsMiddleware } from '../_shared/middleware/cors.ts';
import createSupabaseAdmin from '../_shared/supabaseAdmin.ts';
import createSupabaseClient from '../_shared/supabaseClient.ts';
import {
  insertRevision,
  getArticle,
} from '../_shared/helpers/supabaseHelper.ts';

const functionName = 'ai-review';
const app = new Hono().basePath(`/${functionName}`);

async function getMiraBotId(
  supabaseAdmin: ReturnType<typeof createSupabaseAdmin>
) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', 'mira@wikiadviser.io')
    .maybeSingle();

  if (error) {
    console.error('Error fetching Mira bot ID:', error);
    return null;
  }
  return data?.id ?? null;
}

const miraPrompt = `You are Mira, a Wikipedia editing assistant. You will receive one paragraph at a time.
Your task is to review it focusing on three aspects:

1. Readability – clarity, grammar, logical flow.
2. Eloquence – conciseness, neutral and smooth phrasing.
3. Wikipedia Eligibility Criteria – NPOV, verifiability, encyclopedic style.

Return only JSON:
{
  "comment": "Brief note on improvements",
  "proposed_change": "Improved text or 'No changes needed.'"
}

Make minimal necessary changes. Keep neutral, encyclopedic tone.`;

app.use('*', corsMiddleware);

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMiraJson(content: string | null | undefined) {
  const raw = content ?? '';
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/{[\s\S]*}/);
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

app.post('/', async (c) => {
  try {
    const { article_id } = await c.req.json();
    if (!article_id) return c.json({ error: 'Missing article_id' }, 400);

    const supabaseAdmin = createSupabaseAdmin();

    const MIRA_BOT_ID = await getMiraBotId(supabaseAdmin);
    if (!MIRA_BOT_ID) {
      return c.json({ error: 'Mira bot account not found' }, 500);
    }
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
    if (!apiKey) return c.json({ error: 'No LLM API key configured' }, 500);

    const { data: latestRevision } = await supabaseAdmin
      .from('revisions')
      .select('id, revid')
      .eq('article_id', article_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestRevision)
      return c.json({ error: 'Could not fetch latest revision' }, 500);

    const { data: changes } = await supabaseAdmin
      .from('changes')
      .select('id, content, index')
      .eq('revision_id', latestRevision.id)
      .neq('contributor_id', MIRA_BOT_ID)
      .eq('archived', false)
      .order('index', { ascending: true });

    if (!changes?.length)
      return c.json({ summary: 'No new changes to review.' });

    const newRevisionId = await insertRevision(
      article_id,
      String(Date.now()),
      `AI review by Mira - ${changes.length} change(s) reviewed`
    );

    const reviews: {
      change_id: string;
      comment: string;
      proposed_change: string;
      inserted: boolean;
    }[] = [];

    for (let i = 0; i < changes.length; i++) {
      const ch = changes[i];
      const originalContent = ch.content ?? '';
      const userText = stripHtml(originalContent).slice(0, 4000);
      if (!userText) {
        reviews.push({
          change_id: ch.id,
          comment: 'Empty content',
          proposed_change: 'No changes needed.',
          inserted: false,
        });
        continue;
      }

      const resp = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages: [
              { role: 'system', content: miraPrompt },
              { role: 'user', content: userText },
            ],
            max_tokens: 1200,
            temperature: 0.3,
          }),
        }
      );

      if (!resp.ok) {
        reviews.push({
          change_id: ch.id,
          comment: `LLM error ${resp.status}`,
          proposed_change: 'No changes needed.',
          inserted: false,
        });
        continue;
      }

      const data = await resp.json();
      const rawContent =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        null;
      const parsed = await parseMiraJson(rawContent);

      const comment = parsed?.comment?.trim() ?? 'Review completed';
      const proposed_change =
        parsed?.proposed_change?.trim() ?? 'No changes needed.';

      const changed =
        proposed_change !== 'No changes needed.' &&
        proposed_change !== originalContent &&
        proposed_change !== stripHtml(originalContent);

      let inserted = false;
      if (changed) {
        const insertPayload = {
          revision_id: newRevisionId,
          article_id,
          contributor_id: MIRA_BOT_ID ?? null,
          description: `Mira: ${comment}`,
          content: proposed_change,
          type_of_edit: 1,
          status: 0,
          archived: false,
          hidden: false,
          index: typeof ch.index === 'number' ? ch.index : i + 1,
        };

        const { error: insertError } = await supabaseAdmin
          .from('changes')
          .insert([insertPayload]);
        if (!insertError) inserted = true;
      }

      reviews.push({
        change_id: ch.id,
        comment,
        proposed_change,
        inserted,
      });

      await new Promise((res) => setTimeout(res, 300));
    }

    const totalInserted = reviews.filter((r) => r.inserted).length;

    return c.json({
      summary:
        totalInserted > 0
          ? `Mira reviewed ${changes.length} change(s) and suggested ${totalInserted} improvements.`
          : `Mira reviewed ${changes.length} change(s). No improvements needed.`,
      revision_id: newRevisionId,
      total_changes_reviewed: changes.length,
      total_inserted: totalInserted,
      reviews,
    });
  } catch (err) {
    return c.json(
      { error: 'Unexpected error during review', details: String(err) },
      500
    );
  }
});

Deno.serve((req) => app.fetch(req));
