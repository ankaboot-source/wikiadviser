import { api } from 'src/boot/axios';
import { wikiadviserLanguage } from 'src/data/wikiadviserLanguages';
import { Article, ChangeItem, Permission, User } from 'src/types';
import { EXPIRATION_DAYS } from 'src/utils/consts';
import supabase from './supabase';

export async function getUsers(articleId: string): Promise<User[]> {
  const { data: permissionsData, error: permissionsError } = await supabase
    // Fetch permissions of users of a specific article id
    .from('permissions')
    .select(
      `
      id,
      article_id,
      role,
      user: users(
      raw_user_meta_data,
      email
      )`
    )
    .order('created_at')
    .eq('article_id', articleId);

  if (permissionsError) {
    throw new Error(permissionsError.message);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = permissionsData.map((permission: any) => ({
    picture: permission.user.raw_user_meta_data.picture,
    email: permission.user.email,
    role: permission.role,
    permissionId: permission.id,
  }));
  return users;
}

export async function createArticle(
  title: string,
  userId: string,
  language: wikiadviserLanguage,
  description?: string
) {
  const response = await api.post('article', {
    title,
    userId,
    language,
    description,
  });
  return response.data.articleId;
}

export async function importArticle(
  title: string,
  userId: string,
  language: wikiadviserLanguage,
  description?: string
) {
  const response = await api.post('article/import', {
    title,
    userId,
    language,
    description,
  });
  return response.data.articleId;
}

export async function getArticles(userId: string): Promise<Article[]> {
  // check if user has permission on that Article
  const { data: articleData, error: articleError } = await supabase
    .from('permissions')
    .select(
      `
      id,
      article_id,
      role,
      articles(title,description,created_at,language,web_publication,imported)
      `
    )
    .eq('user_id', userId);

  if (articleError) {
    throw new Error(articleError.message);
  }
  if (articleData.length === 0) {
    return [];
  }

  const articles: Article[] = articleData
    .filter((article) => article.role !== null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((article: any) => ({
      article_id: article.article_id,
      title: article.articles.title,
      description: article.articles.description,
      permission_id: article.id,
      role: article.role,
      language: article.articles.language,
      created_at: new Date(article.articles.created_at),
      web_publication: article.articles.web_publication,
      imported: article.articles.imported,
    }));

  return articles;
}

export async function updatePermission(
  permissions: Permission[]
): Promise<void> {
  const updatedPermissionsPromises = permissions.map(
    async ({ permissionId, role }) => {
      // Update permissions where id matches permissionId
      const { error } = await supabase
        .from('permissions')
        .update({ role })
        .match({ id: permissionId });

      if (error) {
        throw new Error(error.message);
      }
    }
  );

  await Promise.all(updatedPermissionsPromises);
}

export async function getChanges(articleId: string): Promise<ChangeItem[]> {
  const response = await api.get(`article/${articleId}/changes`);
  return response.data.changes;
}

export async function updateChange(
  changeId: string,
  status?: number,
  description?: string,
  archived?: boolean
) {
  const { error: changeError } = await supabase
    .from('changes')
    .update({ status, description, archived })
    .match({ id: changeId });

  if (changeError) {
    throw new Error(changeError.message);
  }
}

export async function insertComment(
  changeId: string,
  commenterId: string,
  content: string
) {
  const { error: changeError } = await supabase
    .from('comments')
    .insert({ change_id: changeId, commenter_id: commenterId, content });

  if (changeError) {
    throw new Error(changeError.message);
  }
}

export async function deletePermission(permissionId: string) {
  const { error: changeError } = await supabase
    .from('permissions')
    .delete()
    .eq('id', permissionId);

  if (changeError) {
    throw new Error(changeError.message);
  }
}

export async function deleteArticle(articleId: string) {
  const apiResponse = await api.delete(`article/${articleId}`);
  if (apiResponse.status !== 200) {
    throw new Error('Failed to delete article from API.');
  }
}

export async function updateChanges(articleId: string) {
  const apiResponse = await api.put(`/article/${articleId}/changes`);
  if (apiResponse.status !== 200) {
    throw new Error('Failed to update changes from API.');
  }
}

export async function createLink(articleId: string) {
  const expiredAt = new Date();
  expiredAt.setDate(expiredAt.getDate() + EXPIRATION_DAYS);

  const { data: token, error: tokenCreationError } = await supabase.rpc(
    'create_share_links',
    {
      p_article_id: articleId,
      expired_at: expiredAt.toISOString(),
    }
  );

  if (tokenCreationError) throw new Error(tokenCreationError.message);

  return token;
}

export async function verifyLink(token: string): Promise<string> {
  const { data: articleId, error: validationError } = await supabase.rpc(
    'add_viewer_to_article',
    {
      token,
    }
  );

  if (validationError) throw new Error(validationError.message);

  return articleId;
}

export async function updateArticleWebPublication(
  web_publication: boolean,
  articleId: string
) {
  const { error } = await supabase
    .from('articles')
    .update({ web_publication })
    .eq('id', articleId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteUser() {
  const { error: deleteUserError } = await supabase.rpc(
    'delete_user_and_anonymize_data'
  );

  if (deleteUserError) throw new Error(deleteUserError.message);
}

export async function hideChanges(changeId: string) {
  const { data: change, error } = await supabase
    .from('changes')
    .select('*')
    .eq('id', changeId)
    .single();

  if (error) {
    throw Error(error.message);
  }

  if (!change) {
    throw new Error(`Change with id(${changeId}) not found`);
  }

  if (change.index !== null) {
    throw new Error('Cannot hide this change');
  }

  const { error: hideError } = await supabase
    .from('changes')
    .update({ hidden: true })
    .eq('id', change.id);

  if (hideError) {
    throw new Error(hideError.message);
  }
}
