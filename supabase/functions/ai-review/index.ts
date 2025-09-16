import { Hono } from 'hono';
import { corsMiddleware } from '../_shared/middleware/cors.ts';
import createSupabaseAdmin from '../_shared/supabaseAdmin.ts';
import { getArticle } from '../_shared/helpers/supabaseHelper.ts';

const functionName = 'ai-review';
const app = new Hono().basePath(`/${functionName}`);

const MIRA_BOT_ID = Deno.env.get('MIRA_BOT_ID');

const miraPrompt = `You are Mira, a Wikipedia editing assistant. You will receive the complete content of an article.
Your task is to review and improve it focusing on three aspects:

1. Readability – clarity, grammar, logical flow.
2. Eloquence – conciseness, neutral and smooth phrasing.  
3. Wikipedia Eligibility Criteria – 
   * Neutral Point of View (NPOV)
   * Verifiability
   * Encyclopedic Style

IMPORTANT: Return the COMPLETE improved article content in the same format as provided.

**Response format:** Always reply in JSON with two fields:
{
  "comment": "A concise explanation of improvements made (or that none were needed).",
  "revised_content": "The complete improved article content, or the original if no changes needed."
}

Make targeted, minimal improvements. If no changes are needed, return the original content exactly.`;

app.use('*', corsMiddleware);
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    console.log('Received body:', body);

    const { article_id } = body;
    if (!article_id) return c.json({ error: 'Missing article_id' }, 400);

    const supabaseClient = createSupabaseAdmin();

    const article = await getArticle(article_id);
    if (!article) {
      return c.json({ error: 'Article not found' }, 404);
    }

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
      .select('id')
      .eq('revision_id', latestRevision.id)
      .neq('contributor_id', MIRA_BOT_ID);

    if (changesError) {
      console.error('Failed to fetch changes:', changesError);
      return c.json({ error: 'Could not fetch changes' }, 500);
    }

    if (!changes || changes.length === 0) {
      return c.json({ summary: 'No new changes to review.' });
    }

    const { data: articleContent, error: contentError } = await supabaseClient
      .from('articles')
      .select('current_html_content, title')
      .eq('id', article_id)
      .maybeSingle();

    if (contentError || !articleContent) {
      console.error('Failed to fetch article content:', contentError);
      return c.json({ error: 'Could not fetch article content' }, 500);
    }

    let currentContent = articleContent.current_html_content;
    
    if (!currentContent) {
      const { data: latestChange } = await supabaseClient
        .from('changes')
        .select('content')
        .eq('revision_id', latestRevision.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestChange?.content) {
        currentContent = latestChange.content;
      }
    }
    
    if (!currentContent) {
      return c.json({ error: 'No content available for review' }, 500);
    }

    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!openRouterKey) {
      return c.json({ error: 'OpenRouter API key not configured' }, 500);
    }

    console.log('Sending content to Mira for review...');

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: miraPrompt },
          { role: 'user', content: currentContent.slice(0, 1000) },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('OpenRouter API error:', err);
      return c.json({ error: 'AI review service unavailable' }, 500);
    }

    const data = await resp.json();
    let parsed;
    
    try {
      parsed = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse Mira response:', parseError);
      return c.json({ error: 'Could not parse AI response' }, 500);
    }

    if (parsed.revised_content === currentContent) {
      return c.json({
        summary: 'Mira reviewed the article but found no improvements needed.',
        comment: parsed.comment,
        changes_made: false
      });
    }

    console.log('Mira made improvements, creating diff and calling updateArticleChanges...');

    const diffHtml = `
<div class="mira-review-diff">
  <div class="diff-header">
    <h3>Mira AI Review</h3>
    <p><strong>Improvements:</strong> ${parsed.comment}</p>
  </div>
  <div class="diff-content">
    ${parsed.revised_content}
  </div>
</div>`;

    const updateUrl = `${c.req.url.replace('/ai-review', '/article')}/${article_id}/changes`;
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(c.req.header('Authorization') && { 
          'Authorization': c.req.header('Authorization') 
        })
      },
      body: JSON.stringify({
        diffHtml: diffHtml
      })
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('Failed to call updateArticleChanges:', error);
      
      return c.json({
        summary: 'Mira completed review but could not process changes through existing system.',
        comment: parsed.comment,
        changes_made: true,
        fallback: true,
        original_length: currentContent.length,
        revised_length: parsed.revised_content.length
      });
    }

    const updateResult = await updateResponse.json();
    console.log('Successfully processed Mira review through updateArticleChanges');

    return c.json({
      summary: 'Mira successfully reviewed and improved the article.',
      comment: parsed.comment,
      changes_made: true,
      processed_via_existing_system: true,
      update_result: updateResult
    });

  } catch (err) {
    console.error('Error in ai-review:', err);
    return c.json(
      { error: 'Unexpected error', details: String(err) },
      500
    );
  }
});

Deno.serve((req) => app.fetch(req));