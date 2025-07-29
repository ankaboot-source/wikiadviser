export async function safeSingle<T>(query: any): Promise<T | null> {
  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('Query error:', JSON.stringify(error, null, 2));
    return null;
  }
  return data;
}