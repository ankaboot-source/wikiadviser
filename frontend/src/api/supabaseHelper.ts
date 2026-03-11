import supabaseClient from 'src/api/supabase';
import { wikiadviserLanguage } from 'src/data/wikiadviserLanguages';
import { Article, ChangeItem, Enums, Permission, User } from 'src/types';
import { SHARE_LINK_DAY_LIMIT } from 'src/utils/consts';
import { parseChangeHtml } from 'src/utils/parsing';
import supabase from './supabase';

export async function getUsers(articleId: string): Promise<User[]> {
  const { data, error } = await supabaseClient.functions.invoke('get/users', {
    method: 'POST',
    body: { articleId },
  });

  if (error) throw new Error(error.message);

  return (data?.users ?? []) as User[];
}

export async function createArticle(
  title: string,
  userId: string,
  language: wikiadviserLanguage,
  description?: string,
) {
  const { data, error } = await supabaseClient.functions.invoke('article', {
    method: 'POST',
    body: {
      title,
      userId,
      language,
      description,
    },
  });
  if (error) throw new Error(error.message);
  return data.articleId;
}

export async function importArticle(
  title: string,
  userId: string,
  language: wikiadviserLanguage,
  description?: string,
) {
  const { data, error } = await supabaseClient.functions.invoke(
    'article/import',
    {
      method: 'POST',
      body: {
        title,
        userId,
        language,
        description,
      },
    },
  );
  if (error) throw error;
  return data.articleId;
}

export async function getArticles(userId: string): Promise<Article[]> {
  const { data, error } = await supabaseClient.functions.invoke('get/articles', {
    method: 'POST',
    body: { userId },
  });

  if (error) throw new Error(error.message);
  
  const articles: Article[] = ((data?.articles ?? []) as Array<{
    article_id: string;
    title: string;
    description: string;
    permission_id: string;
    role: Enums<'role'>;
    language: string;
    created_at: string;
    web_publication: boolean;
    imported: boolean;
    latest_change: {
      created_at: string;
      name: string;
    };
  }>).map((article) => ({
    article_id: article.article_id,
    title: article.title,
    description: article.description,
    permission_id: article.permission_id,
    role: article.role,
    language: article.language,
    created_at: new Date(article.created_at),
    web_publication: article.web_publication,
    imported: article.imported,
    latest_change: {
      created_at: article.latest_change?.created_at ? new Date(article.latest_change.created_at) : undefined,
      name: article.latest_change?.name,
    },
  }));

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
  const { data, error } = await supabaseClient.functions.invoke('get/changes', {
    method: 'POST',
    body: { id, single },
  });

  if (error) throw new Error(error.message);

  const changes = data?.changes ?? [];

  return changes.map((change) => parseChangeHtml(change as unknown as ChangeItem));
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
  const { data, error } = await supabaseClient.functions.invoke(
    `article/${articleId}`,
    {
      method: 'DELETE',
    },
  );
  if (error) throw error;
  return data;
}

async function deleteAllArticles() {
  const { data, error } = await supabaseClient.functions.invoke('article', {
    method: 'DELETE',
  });
  if (error) throw error;
  return data;
}

export async function updateChanges(articleId: string) {
  const { data, error } = await supabaseClient.functions.invoke(
    `article/${articleId}/changes`,
    {
      method: 'PUT',
    },
  );

  if (error) throw new Error('Failed to update changes');
  return data;
}

export async function createLink(articleId: string, role: Enums<'role'>) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SHARE_LINK_DAY_LIMIT);

  const { data: shareLink, error: tokenCreationError } =
    await supabase.functions.invoke('share-link', {
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
  await deleteAllArticles();

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
export async function updateArticleTitle(articleId: string, newTitle: string) {
  const { data, error } = await supabase
    .from('articles')
    .update({ title: newTitle })
    .eq('id', articleId);

  if (error) throw new Error(error.message);
  return data;
}

export async function updateArticleDescription(
  articleId: string,
  newDescription: string,
) {
  const { data, error } = await supabase
    .from('articles')
    .update({ description: newDescription })
    .eq('id', articleId);

  if (error) throw new Error(error.message);
  return data;
}
