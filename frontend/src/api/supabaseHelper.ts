import axios from 'axios';

// Function to fetch users from the API
export async function getUsers(articleid: string) {
  const response = await axios.get('http://localhost:3000/api/users', {
    params: {
      articleid: articleid,
    },
  });
  return response.data.users;
}

export async function createNewArticle(
  title: string,
  userid: string,
  description?: string
) {
  const response = await axios.post('http://localhost:3000/api/new_article', {
    title,
    userid,
    description,
  });
  return response.data.articleid;
}

export async function checkArticleExistenceAndAccess(
  title: string,
  userid: string
) {
  // Check articles existence by returning an articleid, ( returns null if it doesnt exist)
  const response = await axios.get('http://localhost:3000/api/check_article', {
    params: {
      title,
      userid,
    },
  });
  return response.data.articleid;
}
