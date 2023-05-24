import supabase from '../api/supabase';

export default async function insertArticle(
  title: string,
  description: string,
  userid: string
) {
  // Insert into supabase: Articles, Permissions.
  const { data: articlesData, error: articlesError } = await supabase
    .from('articles')
    .insert({ title, description })
    .select();
  if (articlesError) {
    throw new Error(articlesError.message);
  }
  const articleid = articlesData[0].id;

  const { error: permissionsError } = await supabase
    .from('permissions')
    .insert({ role: 0, user_id: userid, article_id: articleid });
  if (permissionsError) {
    throw new Error(permissionsError.message);
  }
}
