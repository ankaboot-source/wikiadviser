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

export async function checkArticleExistenceAndAccess(
  title: string,
  userId: string
) {
  // Check articles existence by returning an articleId, ( returns null if it doesnt exist)
  const response = await api.get('http://localhost:3000/api/check_article', {
    params: {
      title,
      userId,
    },
  });
  return response.data.articleId;
}
