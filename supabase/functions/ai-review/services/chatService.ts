import { callAIWithHistory } from './aiService.ts';
import { buildMiraChatSystemPrompt } from '../config/prompts.ts';
import { getArticle } from '../../_shared/helpers/supabaseHelper.ts';
import type { LLMConfig } from '../utils/types.ts';
import createSupabaseClient from '../../_shared/supabaseClient.ts';
import createSupabaseAdmin from '../../_shared/supabaseAdmin.ts';

interface CommentRow {
  commenter_id: string | null;
  content: string | null;
  profiles_view: {
    display_name: string | null;
    email: string | null;
  } | null;
}

function buildTranscript(comments: CommentRow[], miraBotId: string): string {
  if (!comments.length) return '(no previous messages)';

  return comments
    .map((c) => {
      const isMira = c.commenter_id === miraBotId;
      const name = isMira
        ? 'Mira'
        : c.profiles_view?.display_name || c.profiles_view?.email || 'User';
      return `${name}: ${c.content ?? ''}`;
    })
    .join('\n');
}

export async function handleChatMessage(
  supabase: ReturnType<typeof createSupabaseClient>,
  changeId: string,
  articleId: string,
  newComment: string,
  miraBotId: string,
  config: LLMConfig,
): Promise<void> {
  const admin = createSupabaseAdmin();

  const { data: change, error: changeError } = await admin
    .from('changes')
    .select('content, article_id')
    .eq('id', changeId)
    .single();

  if (changeError || !change) {
    throw new Error(`Change not found: ${changeId}`);
  }

  const { data: comments, error: commentsError } = await admin
    .from('comments')
    .select(
      `
      commenter_id,
      content,
      profiles_view (display_name, email)
      `,
    )
    .eq('change_id', changeId)
    .order('created_at', { ascending: true });

  if (commentsError) {
    throw new Error(`Failed to fetch comments: ${commentsError.message}`);
  }

  const article = await getArticle(change.article_id);

  const transcript = buildTranscript(
    (comments ?? []) as unknown as CommentRow[],
    miraBotId,
  );

  const systemPrompt = buildMiraChatSystemPrompt(
    change.content ?? '',
    article?.title,
    transcript,
  );

  const reply = await callAIWithHistory(
    config.apiKey,
    config.model,
    systemPrompt,
    [{ role: 'user', content: newComment }],
  );

  const { error: insertError } = await admin.from('comments').insert({
    change_id: changeId,
    article_id: articleId,
    commenter_id: miraBotId,
    content: reply,
  });

  if (insertError) {
    throw new Error(`Failed to insert Mira reply: ${insertError.message}`);
  }
}
