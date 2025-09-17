import { safeSingle } from './safeSingle.ts';
import createSupabaseAdmin from '../../_shared/supabaseAdmin.ts';
import { Notification, NotificationType } from '../schema.ts';

export async function getArticleTitle(articleId: string): Promise<string> {
  const supabase = createSupabaseAdmin();
  const article = await safeSingle<{ title: string }>(
    supabase.from('articles').select('title').eq('id', articleId)
  );
  return article?.title ?? 'Unknown Article';
}

export async function getUserEmail(userId: string): Promise<string | null> {
  const supabase = createSupabaseAdmin();
  const user = await safeSingle<{ email: string }>(
    supabase.from('profiles').select('email').eq('id', userId)
  );
  return user?.email ?? null;
}

export async function getUserRole(
  articleId: string,
  userId: string
): Promise<string> {
  const supabase = createSupabaseAdmin();
  const permission = await safeSingle<{ role: string }>(
    supabase
      .from('permissions')
      .select('role')
      .eq('article_id', articleId)
      .eq('user_id', userId)
  );
  return permission?.role ?? 'member';
}
export async function getChangeIdForNotification(
  notification: Notification
): Promise<string | null> {
  const supabase = createSupabaseAdmin();

  if (
    notification.type === NotificationType.Comment &&
    notification.triggered_on
  ) {
    const comment = await safeSingle<{ change_id: string }>(
      supabase
        .from('comments')
        .select('change_id')
        .eq('commenter_id', notification.triggered_on)
        .order('created_at', { ascending: false })
        .limit(1)
    );
    return comment?.change_id ?? null;
  }

  if (
    notification.type === NotificationType.Revision &&
    notification.triggered_on
  ) {
    const change = await safeSingle<{ id: string }>(
      supabase
        .from('changes')
        .select('id')
        .eq('article_id', notification.article_id)
        .order('created_at', { ascending: false })
        .limit(1)
    );
    return change?.id ?? null;
  }
  return null;
}
