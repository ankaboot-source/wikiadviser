import { api } from 'src/boot/axios';

export async function getUsers(articleId: string) {
  try {
    const response = await api.get('http://localhost:3000/api/users', {
      params: {
        articleId: articleId,
      },
    });
    return response.data.users;
  } catch (error) {
    console.log(error);
  }
}

export async function createNewArticle(
  title: string,
  userId: string,
  description?: string
) {
  try {
    const response = await api.post('http://localhost:3000/api/new_article', {
      title,
      userId,
      description,
    });
    return response.data.articleId;
  } catch (error) {
    console.log(error);
  }
}

export async function checkArticleExistenceAndAccess(
  title: string,
  userId: string
) {
  // Check articles existence by returning an articleId, ( returns null if it doesnt exist)
  try {
    const response = await api.get('http://localhost:3000/api/check_article', {
      params: {
        title,
        userId,
      },
    });
    if (response.status == 404) {
      return null;
    }
    return response.data.articleId;
  } catch (error) {
    console.log(error);
  }
}
