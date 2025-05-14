import { Context } from 'hono';
import createSupabaseAdmin from '../_shared/supabaseAdmin.ts';
import createSupabaseClient from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/types/index.ts';
type Permission = Database['public']['Tables']['permissions']['Row'];
export async function verifyShareLink(context: Context) {
  const supabaseClient = createSupabaseClient(
    context.req.header('Authorization')
  );

  const { user } = (await supabaseClient.auth.getUser()).data;

  if (!user) {
    return context.text('Unauthorized', {
      status: 401,
    });
  }

  const profile = (
    await supabaseClient.from('profiles').select('*').eq('id', user.id).single()
  ).data;

  if (!profile) {
    return context.json({ message: 'Unauthorized' }, 403);
  }

  context.set('user', profile);
  try {
    const token = context.req.param('token');
    const user = context.get('user');

    const supabaseAdmin = createSupabaseAdmin();
    const { data: shareRecord } = await supabaseAdmin
      .from('share_links')
      .select('*')
      .eq('id', token)
      .order('expired_at')
      .limit(1)
      .single();

    if (!shareRecord) {
      return context.json({ message: 'Share link not found' }, 404);
    }

    if (shareRecord.expired_at && new Date(shareRecord.expired_at) < new Date()) {
      return context.json({ message: 'Share link expired' }, 403);
    }

    const { article_id: articleId, role } = shareRecord;

    const { data: articlePermissions, error: articlesError } =
      await supabaseAdmin
        .from('permissions')
        .select('*')
        .eq('user_id', user.id);

    if (articlesError) {
      throw new Error(articlesError.message);
    }

    const permissionExists = articlePermissions.find(
      (permission) => permission.article_id === articleId
    );

    if (permissionExists) {
      return context.json(shareRecord, 200);
    }

    if (articlePermissions.length >= user.allowed_articles) {
      return context.json(
        {
          message: 'You have reached the maximum number of articles allowed.',
        },
        402
      );
    }

    await supabaseAdmin.from('permissions').insert(<Permission>{
      user_id: user.id,
      article_id: articleId,
      role,
    });

    return context.json(shareRecord, 200);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return context.json({ message }, 500);
  }
}
