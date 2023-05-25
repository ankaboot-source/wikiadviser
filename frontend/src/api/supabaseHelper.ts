import { api } from 'src/boot/axios';

export async function getUsers(articleId: string) {
  const response = await api.get('http://localhost:3000/api/users', {
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
  const response = await api.post('http://localhost:3000/api/new_article', {
    title,
    userId,
    description,
  });
  return response.data.articleId;
}

// permission request
export async function createNewPermissionRequest(
  articleId: string,
  userId: string
) {
  const response = await api.post('http://localhost:3000/api/permission', {
    articleId,
    userId,
  });
  //checks for article existence, a3tih reviewer toul
  return response.status;
}

export async function getArticles(userId: string) {
  const response = await api.get('http://localhost:3000/api/articles', {
    params: {
      userId,
    },
  });
  return response.data.articles;
}

// update permission
export async function updatePermission(permissionId: string, role: number) {
  const response = await api.put('http://localhost:3000/api/permission', {
    permissionId,
    role,
  });
  //checks for article existence, a3tih reviewer toul
  return response.status;
}
