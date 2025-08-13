import createSupabaseAdmin from '../../_shared/supabaseAdmin.ts';
export const supabase = createSupabaseAdmin();

export async function getOwner(articleId: string) {
  const { data, error } = await supabase
    .from('permissions')
    .select('user_id')
    .eq('article_id', articleId)
    .eq('role', 'owner')
    .single();
  return error ? null : data.user_id;
}
export async function getEditors(articleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('user_id')
    .eq('article_id', articleId)
    .eq('role', 'editor');

  if (error || !data) {
    return [];
  }

  return data.map(row => row.user_id);
}
export async function getArticleParticipants(articleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('user_id')
    .eq('article_id', articleId);

  if (error || !data) {
    return [];
  }

  return data.map(row => row.user_id);
}
