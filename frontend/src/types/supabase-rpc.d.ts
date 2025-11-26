import '@supabase/supabase-js';

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    rpc(
      fn: 'upsert_user_api_key',
      args: { user_id_param: string; api_key_value: string },
    ): Promise<{ data: string | null; error: any }>;

    rpc(
      fn: 'get_user_api_key',
      args: { user_id_param: string },
    ): Promise<{ data: string | null; error: any }>;

    rpc(
      fn: 'delete_user_api_key',
      args: { user_id_param: string },
    ): Promise<{ data: boolean | null; error: any }>;
  }
}
