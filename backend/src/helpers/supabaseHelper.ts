import supabase from '../api/supabase';
import { Change, Role } from '../types';

export async function insertArticle(
  title: string,
  userId: string,
  language: string,
  description?: string,
  imported?: boolean
): Promise<string> {
  // Insert into supabase: Articles, Permissions.
  const { data: articlesData, error: articlesError } = await supabase
    .from('articles')
    .insert({ title, description, language, imported })
    .select();
  if (articlesError) {
    throw new Error(articlesError.message);
  }
  const articleId = articlesData[0].id;

  const { error: permissionsError } = await supabase
    .from('permissions')
    .insert({ role: 'owner', user_id: userId, article_id: articleId });
  if (permissionsError) {
    throw new Error(permissionsError.message);
  }
  return articleId;
}

export async function updateChange(toChange: Change): Promise<void> {
  const { id, ...updateData } = toChange;
  const { error: changeError } = await supabase
    .from('changes')
    .update(updateData)
    .eq('id', id);
  if (changeError) {
    throw new Error(changeError.message);
  }
}

export async function upsertChanges(changesToUpsert: Change[]): Promise<void> {
  const { error } = await supabase.from('changes').upsert(changesToUpsert, {
    defaultToNull: false,
    onConflict: 'id'
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateCurrentHtmlContent(
  articleId: string,
  current_html_content: string
) {
  const { error: articleError } = await supabase
    .from('articles')
    .update({ current_html_content })
    .eq('id', articleId);
  if (articleError) {
    throw new Error(articleError.message);
  }
}

export async function getArticle(articleId: string) {
  const { data: articleData, error: articleError } = await supabase
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .single();
  if (articleError) {
    throw new Error(articleError.message);
  }
  return articleData;
}

export async function getChanges(articleId: string) {
  const { data: changesData, error: changesError } = await supabase
    .from('changes')
    .select(
      `
      id,
      content,
      created_at,
      description,
      status,
      type_of_edit,
      index,
      article_id,
      contributor_id,
      revision_id,
      archived,
      hidden,
      user: users(id, email, picture: raw_user_meta_data->>"picture"), 
      comments(content,created_at, user: users(id, email, picture: raw_user_meta_data->>"picture")),
      revision: revisions(summary, revid)
      `
    )
    .order('index')
    .eq('article_id', articleId);

  if (changesError) {
    throw new Error(changesError.message);
  }
  return changesData;
}

export async function deleteArticleDB(articleId: string) {
  const { error: supabaseDeleteError } = await supabase
    .from('articles')
    .delete()
    .eq('id', articleId);

  if (supabaseDeleteError) {
    throw new Error(supabaseDeleteError.message);
  }
}

export async function getUserPermission(
  articleId: string,
  userId: string
): Promise<Role | null> {
  const { data } = await supabase
    .from('permissions')
    .select()
    .eq('user_id', userId)
    .eq('article_id', articleId)
    .single();

  return data?.role;
}

export async function insertRevision(
  article_id: string,
  revid: string,
  summary: string
) {
  const { data: revisionsData, error: revisionsError } = await supabase
    .from('revisions')
    .insert({ article_id, revid, summary })
    .select();
  if (revisionsError) {
    throw new Error(revisionsError.message);
  }
  const [revision] = revisionsData;
  return revision.id;
}
