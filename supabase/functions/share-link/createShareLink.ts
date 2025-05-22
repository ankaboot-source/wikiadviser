import { Context } from 'hono';
import createSupabaseAdmin from '../_shared/supabaseAdmin.ts';
import createSupabaseClient from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/types/index.ts';

type ShareLink = Database['public']['Tables']['share_links']['Row'];

export async function createShareLink(context: Context) {
  const supabaseClient = createSupabaseClient(context.req.header('Authorization'));
  const { user } = (await supabaseClient.auth.getUser()).data;

  if (!user) throw new Error('Unauthorized', { cause: { status: 401 } });

  const profile = (await supabaseClient.from('profiles').select('*').eq('id', user.id).single()).data;
  if (!profile) throw new Error('Unauthorized', { cause: { status: 403 } });

  context.set('user', profile);
  try {
    const user = context.get('user');
    const {
      article_id: articleId,
      expires_at: expiresAt,
      role,
    } = await context.req.json();

    const supabaseAdmin = createSupabaseAdmin();

    if (!articleId || !expiresAt) throw new Error('Invalid request body', { cause: { status: 400 } });

    const hasPermission = await supabaseAdmin
      .from('permissions')
      .select('id')
      .eq('user_id', user.id)
      .eq('article_id', articleId)
      .eq('role', 'owner')
      .single();

      if (!hasPermission) throw new Error('Insufficient permissions', { cause: { status: 403 } });

    const { data: shareLink } = await supabaseAdmin
      .from('share_links')
      .insert(<ShareLink>{
        article_id: articleId,
        expired_at: expiresAt,
        role,
      })
      .select('*')
      .single();

    return context.json(shareLink, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return context.json({ message }, 500);
  }
}
