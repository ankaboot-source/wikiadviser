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
    article_id,
    role,
    users(
      raw_user_meta_data,
      email
      )`
    )
    .eq('article_id', articleId);

  logger.info(
    {
      permissionsData
    },
    'check articles data'
  );

  if (permissionsError) {
    throw new Error(permissionsError.message);
  }

  const users = permissionsData.map((permission: any) => ({
    username: permission.users.raw_user_meta_data.username,
    email: permission.users.email,
    role: permission.role
  }));
  return users;
}

export async function checkArticleExistenceAndAccess(
  title: string,
  userId: string
): Promise<string | null> {
  // check if Article with that title exists
  const { data: articlesData, error: articlesError } = await supabase
    .from('articles')
    .select('id', { count: 'exact' })
    .eq('title', title)
    .maybeSingle();

  logger.info(
    {
      articlesData
    },
    'check articles data'
  );

  if (articlesError) {
    throw new Error(articlesError.message);
  }

  if (!articlesData) {
    // Article with the given title does not exist
    return null;
  }

  // check if user has permission on that Article
  const { data: permissionsData, error: permissionsError } = await supabase
    .from('permissions')
    .select('id')
    .eq('article_id', articlesData.id)
    .eq('user_id', userId)
    .maybeSingle();

  logger.info(
    {
      permissionsData
    },
    'check permissions data'
  );

  if (permissionsError) {
    throw new Error(permissionsError.message);
  }

  if (permissionsData) {
    return articlesData.id;
  }
  return null;
}
