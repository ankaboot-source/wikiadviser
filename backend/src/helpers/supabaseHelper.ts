import supabase from '../api/supabase';
import { Change } from '../types';

export async function insertArticle(
  title: string,
  userId: string,
  description?: string
): Promise<string> {
  // Insert into supabase: Articles, Permissions.
  const { data: articlesData, error: articlesError } = await supabase
    .from('articles')
    .insert({ title, description })
    .select();
  if (articlesError) {
    throw new Error(articlesError.message);
  }
  const articleId = articlesData[0].id;

  const { error: permissionsError } = await supabase
    .from('permissions')
    .insert({ role: 0, user_id: userId, article_id: articleId });
  if (permissionsError) {
    throw new Error(permissionsError.message);
  }
  return articleId;
}

export async function createNewChange(permissionId: string): Promise<string> {
  const { data: permissionData, error: permissionError } = await supabase
    .from('permissions')
    .select('article_id, user_id')
    .eq('id', permissionId)
    .single();

  if (permissionError) {
    throw new Error(permissionError.message);
  }

  // Insert
  const { data: changeData, error: changeError } = await supabase
    .from('changes')
    .insert({
      article_id: permissionData.article_id,
      contributor_id: permissionData.user_id
    })
    .select();

  if (changeError) {
    throw new Error(changeError.message);
  }

  const username = changeData[0].id;

  return username;
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
  const { error } = await supabase.from('changes').upsert(changesToUpsert);
  if (error) {
    throw new Error(error.message);
  }
}

export async function insertChanges(
  changesToInsert: Change[],
  permissionId?: string
): Promise<void> {
  if (permissionId) {
    const { data: permissionData, error: permissionError } = await supabase
      .from('permissions')
      .select('article_id, user_id')
      .eq('id', permissionId)
      .maybeSingle();
    if (permissionError) {
      throw new Error(permissionError.message);
    }
    if (permissionData?.article_id && permissionData?.user_id) {
      for (const change of changesToInsert) {
        if (!change.id) {
          // Add 'article_id' and 'contributor_id' properties
          change.article_id = permissionData.article_id;
          change.contributor_id = permissionData.user_id;
        }
      }
    }
    const { error } = await supabase.from('changes').insert(changesToInsert);
    if (error) {
      throw new Error(error.message);
    }
  }
}

export async function updateArticle(
  permissionId: string,
  current_html_content: string
) {
  const { data: articleIddata, error: articleIdError } = await supabase
    .from('permissions')
    .select(`article_id`)
    .eq('id', permissionId)
    .single();
  if (articleIdError) {
    throw new Error(articleIdError.message);
  }

  const { error: articleError } = await supabase
    .from('articles')
    .update({ current_html_content })
    .eq('id', articleIddata.article_id);
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
      users(
        raw_user_meta_data), 
        comments(content,created_at, 
        users(raw_user_meta_data)
        )
      `
    )
    .order('index')
    .eq('article_id', articleId);

  if (changesError) {
    throw new Error(changesError.message);
  }
  return changesData;
}

export async function removeChanges(permissionId: string) {
  const { data: articleData, error: articleError } = await supabase
    .from('permissions')
    .select('article_id')
    .eq('id', permissionId)
    .single();

  if (articleError) {
    throw new Error(articleError.message);
  }

  const { error } = await supabase
    .from('changes')
    .delete()
    .eq('article_id', articleData.article_id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteArticle(articleId: string) {
  const { error: supabaseDeleteError } = await supabase
    .from('articles')
    .delete()
    .eq('id', articleId);

  if (supabaseDeleteError) {
    throw new Error(supabaseDeleteError.message);
  }
}
