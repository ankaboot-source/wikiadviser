import { createClient } from '@supabase/supabase-js';
import ENV from '../schema/env.schema';

const supabaseClient = createClient(
  ENV.SUPABASE_PROJECT_URL,
  ENV.SUPABASE_SECRET_PROJECT_TOKEN
);

export default supabaseClient;
