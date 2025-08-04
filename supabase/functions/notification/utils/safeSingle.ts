export async function safeSingle<T>(query: any): Promise<T | null> {
  const { data, error } = await query.maybeSingle();
  if (error) console.error('Query error:', error);
  return data;
}