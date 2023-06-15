import { api } from 'src/boot/axios';

export async function getUsers(articleId: string) {
  const response = await api.get('users', {
    params: {
      articleId: articleId,
    },
  });
  return response.data.users;
}

export async function createNewArticle(
  title: string,
  userId: string,
  description?: string
) {
  const response = await api.post('article', {
    title,
    userId,
    description,
  });
  return response.data.articleId;
}

export async function createNewPermissionRequest(
  articleId: string,
  userId: string
) {
  const response = await api.post('permission', {
    articleId,
    userId,
  });
  return response.status;
}

export async function getArticles(userId: string) {
  const response = await api.get('articles', {
    params: {
      userId,
    },
  });
  return response.data.articles;
}

export async function updatePermission(permissionId: string, role: number) {
  const response = await api.put('permission', {
    permissionId,
    role,
  });
  return response.status;
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
  const response = await api.put('article/change', {
    changeId,
    status,
    description,
  });
  console.log(changeId, status, description);
  return response.status;
}

export async function insertComment(
  changeId: string,
  commenterId: string,
  content: string
) {
  const response = await api.post('change/comment', {
    changeId,
    commenterId,
    content,
  });
  return response.status;
}
