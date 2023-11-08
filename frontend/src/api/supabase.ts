import { createBrowserClient } from '@supabase/ssr';

const supabaseClient = createBrowserClient(
  process.env.SUPABASE_PROJECT_URL!,
  process.env.SUPABASE_SECRET_PROJECT_TOKEN!
);
export default supabaseClient;
