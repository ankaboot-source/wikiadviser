import supabase from '../api/supabase';
import logger from '../logger';
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

export async function getRole(
  articleId: string,
  userId: string
): Promise<number | null> {
  // check if user has permission on that Article
  const { data: permissionsData, error: permissionsError } = await supabase
    .from('permissions')
    .select('role')
    .eq('article_id', articleId)
    .eq('user_id', userId)
    .maybeSingle();

  logger.info(
    {
      permissionsData
    },
    'Get role'
  );

  if (permissionsError) {
    throw new Error(permissionsError.message);
  }
  if (permissionsData) {
    return permissionsData.role;
  }
  return null;
}

export async function getArticles(userId: string): Promise<any> {
  // check if user has permission on that Article
  const { data: articleData, error: articleError } = await supabase
    .from('permissions')
    .select(
      `
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
  // update Permission role
  await supabase.from('permissions').update({ role }).eq('id', permissionId);
}
