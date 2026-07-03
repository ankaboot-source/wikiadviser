import { Context } from 'npm:hono@4.7.4';
import createSupabaseAdmin from '../_shared/supabaseAdmin.ts';

export async function setPendingDiff(c: Context) {
  const { id: articleId } = c.req.param();

  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin
      .from('articles')
      .update({ pending_diff: true })
      .eq('id', articleId);
    if (error) throw error;
    return c.json({ message: 'Pending diff set.' }, 200);
  } catch (error) {
    console.error('[setPendingDiff] Failed:', error);
    return c.json({ error: 'Failed to set pending diff.' }, 500);
  }
}
