import { createClient } from '@supabase/supabase-js';

const SUPABASE_PROJECT_URL = process.env.SUPABASE_PROJECT_URL;
const SUPABASE_SECRET_PROJECT_TOKEN = process.env.SUPABASE_SECRET_PROJECT_TOKEN;

const supabaseClient = createClient(
  SUPABASE_PROJECT_URL!,
  SUPABASE_SECRET_PROJECT_TOKEN!
);
export default supabaseClient;
