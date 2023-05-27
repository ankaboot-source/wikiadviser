import supabase from '../api/supabase';
import { User } from '../types';

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

export async function getUsersWithPermissions(
  articleId: string
): Promise<User[]> {
  const { data: permissionsData, error: permissionsError } = await supabase
    // Fetch permissions of users of a specific article id
    .from('permissions')
    .select(
      `
      id,
    article_id,
    role,
    users(
      raw_user_meta_data,
      email
      )`
    )
    .eq('article_id', articleId);

  if (permissionsError) {
    throw new Error(permissionsError.message);
  }

  const users = permissionsData.map((permission: any) => ({
    username: permission.users.raw_user_meta_data.username,
    email: permission.users.email,
    role: permission.role,
    permissionId: permission.id
  }));
  return users;
}

export async function getArticles(userId: string): Promise<any> {
  // check if user has permission on that Article
  const { data: articleData, error: articleError } = await supabase
    .from('permissions')
    .select(
      `
      id,
    article_id,
    role,
    articles(title,description)
    `
    )
    .eq('user_id', userId);

  if (articleError) {
    throw new Error(articleError.message);
  }
  if (articleData.length === 0) {
    return null;
  }

  const articles = articleData
    .filter((article: any) => article.role !== null)
    .map((article: any) => ({
      article_id: article.article_id,
      title: article.articles.title,
      description: article.articles.description,
      permission_id: article.id,
      role: article.role
    }));

  return articles;
}

export async function createNewPermission(
  articleId: string,
  userId: string
): Promise<any> {
  // check if user has permission on that Article
  const existingPermission = await supabase
    .from('permissions')
    .select('*')
    .eq('user_id', userId)
    .eq('article_id', articleId)
    .maybeSingle();

  // if not, add a permission request.
  if (!existingPermission.data) {
    const { error: permissionError } = await supabase
      .from('permissions')
      .insert({ user_id: userId, article_id: articleId });
    if (permissionError) {
      throw new Error(permissionError.message);
    }
  }
}

export async function updatePermission(
  permissionId: string,
  role: number
): Promise<any> {
  await supabase.from('permissions').update({ role }).eq('id', permissionId);
}

export async function getUsername(permissionId: string): Promise<string> {
  const { data: permissionsData, error: permissionsError } = await supabase
    // Fetch permissions of users of a specific article id
    .from('permissions')
    .select(
      `*,
    users(
      raw_user_meta_data)`
    )
    .eq('id', permissionId)
    .maybeSingle();

  if (permissionsError) {
    throw new Error(permissionsError.message);
  }

  const username = permissionsData?.users.raw_user_meta_data.username;
  return username;
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

export async function updateChange(
  changeId: string,
  content: string,
  status: number,
  description?: string,
  typeOfEdit?: number
): Promise<void> {
  // Update
  const updateData: any = {
    status,
    content
  };

  if (typeOfEdit !== undefined) {
    updateData.type_of_edit = typeOfEdit;
  }
  if (description !== undefined) {
    updateData.description = description;
  }
  const { error: changeError } = await supabase
    .from('changes')
    .update(updateData)
    .eq('id', changeId);

  if (changeError) {
    throw new Error(changeError.message);
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
    users(
      raw_user_meta_data)`
    )
    .order('created_at')
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
