import { api } from 'src/boot/axios';
import supabase from './supabase';
import {
  Article,
  User,
  Permission,
  UserRole,
  wikipediaLanguage,
} from 'src/types';

export async function getUsers(articleId: string): Promise<User[]> {
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
    .order('created_at')
    .eq('article_id', articleId);

  if (permissionsError) {
    throw new Error(permissionsError.message);
  }

  const users = permissionsData.map((permission: any) => ({
    username: permission.users.raw_user_meta_data.username,
    email: permission.users.email,
    role: permission.role,
    permissionId: permission.id,
  }));
  return users;
}

export async function createNewArticle(
  title: string,
  userId: string,
  language: wikipediaLanguage,
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

export async function getArticles(userId: string): Promise<Article[] | null> {
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

  const articles: Article[] = articleData
    .filter((article) => article.role !== null)
    .map((article: any) => ({
      article_id: article.article_id,
      title: article.articles.title,
      description: article.articles.description,
      permission_id: article.id,
      role: article.role,
    }));

  return articles;
}

export async function updatePermission(
  permission: Permission[]
): Promise<void> {
  const mappedPermissions = permission.map(({ permissionId, role }) => ({
    id: permissionId,
    role,
  }));

  const { error: changeError } = await supabase
    .from('permissions')
    .upsert(mappedPermissions);

  if (changeError) {
    throw new Error(changeError.message);
  }
}

export async function getArticleParsedContent(articleId: string) {
  const response = await api.get('article/parsedContent', {
    params: {
      articleId,
    },
  });
  return response.data.content;
}

export async function getChanges(articleId: string) {
  const response = await api.get('article/changes', {
    params: {
      articleId,
    },
  });
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
    .eq('id', changeId);

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
  const apiResponse = await api.delete('article', {
    data: {
      articleId,
    },
  });
  if (apiResponse.status !== 200) {
    throw new Error('Failed to delete article from API.');
  }
}
