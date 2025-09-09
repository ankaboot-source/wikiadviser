import { Hono } from 'hono';
import  createSupabaseClient  from '../_shared/supabaseClient.ts';
import { corsMiddleware } from '../_shared/middleware/cors.ts';

const app = new Hono();
app.use("*", corsMiddleware);
app.post('/', async (c) => {
  try {
    const { article_id, language } = await c.req.json();

    if (!article_id) {
      return c.json({ error: 'Missing article_id' }, 400);
    }
    const supabaseClient = createSupabaseClient(
        c.req.header("Authorization")
      );

    // Fetch latest revision content
    const { data: revision, error: revError } = await supabaseClient
      .from('revisions')
      .select('content')
      .eq('article_id', article_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (revError || !revision) {
      return c.json({ error: 'Could not fetch revision' }, 500);
    }

    // Call OpenRouter API
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Free/cheap model
        messages: [
          {
            role: 'system',
            content: `You are Mira, an assistant reviewing Wikipedia-style text. 
                      Language: ${language}. 
                      Provide constructive feedback, factual issues, 
                      and suggest improvements in bullet points.`,
          },
          {
            role: 'user',
            content: revision.content,
          },
        ],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return c.json({ error: `OpenRouter error: ${err}` }, 500);
    }

    const data = await resp.json();
    const summary =
      data.choices?.[0]?.message?.content || 'No feedback generated.';

    return c.json({ summary });
  } catch (err) {
    console.error('Error in review_ai (openrouter):', err);
    return c.json({ error: 'Unexpected error' }, 500);
  }
});

export default app;
