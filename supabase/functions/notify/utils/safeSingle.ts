export async function safeSingle<T>(query: any): Promise<T | null> {
  const { data, error } = await query.single();
  if (error) {
    console.error('Query error:', error);
    return null;
  }
  return data;
}