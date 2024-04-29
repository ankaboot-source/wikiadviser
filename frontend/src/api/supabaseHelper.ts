import { api } from 'src/boot/axios';
import { wikiadviserLanguage } from 'src/data/wikiadviserLanguages';
import { Article, ChangeItem, Enums, Permission, User } from 'src/types';
import { EXPIRATION_DAYS } from 'src/utils/consts';
import { parseChangeHtml } from 'src/utils/parsing';
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
      user: profiles(id, email, avatar_url, default_avatar, allowed_articles)
      `,
    )
    .order('created_at')
    .eq('article_id', articleId);

  if (permissionsError) {
    throw new Error(permissionsError.message);
  }

  const users: User[] = permissionsData.map(
    (permission) =>
      ({
        picture: permission.user?.avatar_url,
        email: permission.user?.email,
        role: permission.role,
        permissionId: permission.id,
      }) as User,
  );

  return users;
}

export async function createArticle(
  title: string,
  userId: string,
  language: wikiadviserLanguage,
  description?: string,
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
  description?: string,
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
      `,
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
    .map(
      (article) =>
        ({
          article_id: article.article_id,
          title: article.articles?.title,
          description: article.articles?.description,
          permission_id: article.id,
          role: article.role,
          language: article.articles?.language,
          created_at: new Date(article.articles?.created_at as string),
          web_publication: article.articles?.web_publication,
          imported: article.articles?.imported,
        }) as Article,
    );

  return articles;
}

export async function isArticleExists(articleId: string): Promise<boolean> {
  const { data: articleData, error: articleError } = await supabase.rpc(
    'is_article_exists',
    {
      article_id: articleId,
    },
  );

  if (articleError) {
    return false;
  }

  return Boolean(articleData);
}

export async function updatePermission(
  permissions: Permission[],
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
    },
  );

  await Promise.all(updatedPermissionsPromises);
}

/**
 * Retrieves and parses changes from the database based on the provided ID.
 *
 * @param id - The ID of the changes or the article ID depending on the context.
 * @param single - Retrieve single change or all, default "false"
 * @throws {Error} Throws an error on fail.
 */
export async function getParsedChanges(
  id: string,
  single = false,
): Promise<ChangeItem[]> {
  const { data, error } = await supabase
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
        user: profiles(id, email, avatar_url), 
        comments: comments(content,created_at, user: profiles(id, email, avatar_url)),
        revision: revisions(summary, revid)
        `,
    )
    .order('index')
    .eq(single ? 'id' : 'article_id', id);

  if (!data || error) {
    throw new Error(error?.message ?? 'Could not get parsed changes');
  }
  return data.map((change) => parseChangeHtml(change as unknown as ChangeItem));
}

export async function updateChange(
  changeId: string,
  status?: number,
  description?: string,
  archived?: boolean,
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
  articleId: string,
  content: string,
) {
  const { error: changeError } = await supabase.from('comments').insert({
    change_id: changeId,
    commenter_id: commenterId,
    article_id: articleId,
    content,
  });

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

export async function createLink(articleId: string, role: Enums<'role'>) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPIRATION_DAYS);

  const { data: shareLink, error: tokenCreationError } =
    await supabase.functions.invoke('share_links', {
      method: 'POST',
      body: {
        article_id: articleId,
        expires_at: expiresAt.toISOString(),
        role,
      },
    });

  if (tokenCreationError) throw new Error(tokenCreationError.message);

  return shareLink.id;
}

export async function updateArticleWebPublication(
  web_publication: boolean,
  articleId: string,
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
    'delete_user_and_anonymize_data',
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
