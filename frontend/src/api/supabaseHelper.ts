import { api } from 'src/boot/axios';
import supabase from './supabase';
import {
  Article,
  User,
  Permission,
  UserRole,
  ChangesItem,
  ShareLink,
} from 'src/types';
import { wikiadviserLanguage } from 'src/data/wikiadviserLanguages';
import { DAY_LIMIT } from 'src/consts';

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

  const users = permissionsData.map((permission: any) => ({
    picture: permission.user.raw_user_meta_data.picture,
    email: permission.user.email,
    role: permission.role,
    permissionId: permission.id,
  }));
  return users;
}

export async function createNewArticle(
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

export async function createNewPermission(
  articleId: string,
  userId: string
): Promise<void> {
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
      .insert({
        user_id: userId,
        article_id: articleId,
        role: UserRole.Viewer,
      });
    if (permissionError) {
      throw new Error(permissionError.message);
    }
  }
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
      articles(title,description,created_at,language)
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
    .map((article: any) => ({
      article_id: article.article_id,
      title: article.articles.title,
      description: article.articles.description,
      permission_id: article.id,
      role: article.role,
      language: article.articles.language,
      created_at: new Date(article.articles.created_at),
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
export async function getArticleParsedContent(articleId: string) {
  const response = await api.get(`article/${articleId}`);
  return response.data.content;
}

export async function getChanges(articleId: string): Promise<ChangesItem[]> {
  const response = await api.get(`article/${articleId}/changes`);
  return response.data.changes;
}

export async function updateChange(
  changeId: string,
  status?: number,
  description?: string
) {
  const { error: changeError } = await supabase
    .from('changes')
    .update({ status, description })
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
  const { data } = await supabase
    .from('share_links')
    .insert({ article_id: articleId })
    .select()
    .single<ShareLink>();

  return data?.id;
}

export async function verifyLink(token: string): Promise<string | undefined> {
  const { data } = await supabase
    .from('share_links')
    .select()
    .eq('id', token)
    .single<ShareLink>();

  return data?.article_id;
}
