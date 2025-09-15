import { Hono } from 'hono';
import { corsMiddleware } from '../_shared/middleware/cors.ts';
import createSupabaseAdmin from '../_shared/supabaseAdmin.ts';
import { insertRevision } from '../_shared/helpers/supabaseHelper.ts';

const functionName = 'ai-review';
const app = new Hono().basePath(`/${functionName}`);

const MIRA_BOT_ID = Deno.env.get('MIRA_BOT_ID');

const miraPrompt = `You are Mira, a Wikipedia editing assistant. You will receive one paragraph at a time. 
Your task is to review it focusing on three aspects:

1. Readability – clarity, grammar, logical flow.
2. Eloquence – conciseness, neutral and smooth phrasing.
3. Wikipedia Eligibility Criteria – 
   * Neutral Point of View (NPOV)
   * Verifiability
   * Encyclopedic Style

**Response format:** Always reply in JSON with two fields:
{
  "comment": "A concise and kind note explaining if and why a change may help (or confirming that none is needed).",
  "proposed_change": "The minimalist modification of the paragraph, or 'No changes needed.'"
}

If no change is needed, Mira must still return this JSON format with a positive comment and "No changes needed."`;

app.use('*', corsMiddleware);
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    console.log('Received body:', body);

    const { article_id } = body;
    if (!article_id) return c.json({ error: 'Missing article_id' }, 400);

    const supabaseClient = createSupabaseAdmin();

    const { data: latestRevision, error: revError } = await supabaseClient
      .from('revisions')
      .select('id, revid')
      .eq('article_id', article_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (revError || !latestRevision) {
      console.error('Failed to fetch latest revision:', revError);
      return c.json({ error: 'Could not fetch latest revision' }, 500);
    }

    const { data: changes, error: changesError } = await supabaseClient
      .from('changes')
      .select('id, content')
      .eq('revision_id', latestRevision.id)
      .neq('contributor_id', MIRA_BOT_ID);

    if (changesError || !changes || changes.length === 0) {
      return c.json({ summary: 'No new changes to review.' });
    }

    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterKey) {
      console.error('❌ Missing OPENROUTER_API_KEY');
      return c.json({ error: 'OpenRouter API key not configured' }, 500);
    }

    const newRevid = latestRevision.revid + 1;
    const newRevisionId = await insertRevision(
      article_id,
      String(newRevid),
      'AI review by Mira'
    );

    const reviews: {
      change_id: string;
      comment: string;
      proposed_change: string;
    }[] = [];
    type ChangeInsert = {
      revision_id: string;
      article_id: string;
      contributor_id: string | undefined;
      description: string;
      content: string;
      type_of_edit: number;
      status: number;
      archived: boolean;
      hidden: boolean;
    };
    const changesToInsert: ChangeInsert[] = [];

    for (const ch of changes) {
      console.log('Reviewing change:', ch.id);

      const resp = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages: [
              { role: 'system', content: miraPrompt },
              { role: 'user', content: ch.content?.slice(0, 4000) || '' },
            ],
            max_tokens: 600,
            temperature: 0.7,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.text();
        console.error('OpenRouter API error:', err);
        continue;
      }

      const data = await resp.json();

      let parsed;
      try {
        parsed = JSON.parse(data.choices[0].message.content);
      } catch {
        parsed = {
          comment: 'Could not parse Mira response',
          proposed_change: 'No changes needed.',
        };
      }

      changesToInsert.push({
        revision_id: newRevisionId,
        article_id,
        contributor_id: MIRA_BOT_ID,
        description: parsed.comment,
        content: parsed.proposed_change,
        type_of_edit: 1,
        status: 1,
        archived: false,
        hidden: false,
      });

      reviews.push({ change_id: ch.id, ...parsed });
      console.log('Prepared Mira review for change:', ch.id);
    }

    if (changesToInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('changes')
        .insert(changesToInsert);
      if (insertError) {
        console.error("Failed to insert Mira's reviews:", insertError);
        return c.json({ error: 'Failed to insert AI reviews.' }, 500);
      }
    }

    return c.json({
      summary: `Mira reviewed ${reviews.length} change(s) in one revision.`,
      reviews,
      revision_id: newRevisionId,
    });
  } catch (err) {
    console.error('Error in ai-review:', err);
    return c.json(
      { error: 'Unexpected error', debug: { message: String(err) } },
      500
    );
  }
});

Deno.serve((req) => app.fetch(req));
