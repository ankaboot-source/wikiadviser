import { createClient } from '@supabase/supabase-js';
import env from '../schema/env.schema';

const supabaseClient = createClient(
  env.SUPABASE_PROJECT_URL,
  env.SUPABASE_SECRET_PROJECT_TOKEN
);

export default supabaseClient;
