import supabase from '../api/supabase';
import logger from '../logger';

export async function insertArticle(
  title: string,
  userid: string,
  description?: string
) {
  // Insert into supabase: Articles, Permissions.
  const { data: articlesData, error: articlesError } = await supabase
    .from('articles')
    .insert({ title, description })
    .select();
  if (articlesError) {
    throw new Error(articlesError.message);
  }
  const articleid = articlesData[0].id;

  const { error: permissionsError } = await supabase
    .from('permissions')
    .insert({ role: 0, user_id: userid, article_id: articleid });
  if (permissionsError) {
    throw new Error(permissionsError.message);
  }
  return articleid;
}

export async function fetchUsersWithPermissions(articleid: string) {
  // Fetch permissions
  const { data: permissionsData, error: permissionsError } = await supabase
    .from('permissions')
    .select('user_id, role')
    .eq('article_id', articleid);

  if (permissionsError) {
    throw new Error(permissionsError.message);
  }

  const userIds = permissionsData.map((permission) => permission.user_id);

  // Fetch usernames
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, raw_user_meta_data')
    .in('id', userIds);

  if (usersError) {
    throw new Error(usersError.message);
  }

  const userMap = new Map(
    usersData.map((user) => [user.id, user.raw_user_meta_data.username])
  );

  const users = permissionsData.map((permission) => ({
    username: userMap.get(permission.user_id),
    role: permission.role
  }));

  return users;
}

export async function checkArticleExistenceAndAccess(
  title: string,
  userid: string
) {
  // check if it exists in Articles
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

  // check if user has permission
  const { data: permissionsData, error: permissionsError } = await supabase
    .from('permissions')
    .select('id')
    .eq('article_id', articlesData.id)
    .eq('user_id', userid)
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
