import { createClient } from '@supabase/supabase-js';

require('dotenv').config();

const supabaseClient = createClient(
  process.env.SUPABASE_PROJECT_URL!,
  process.env.SUPABASE_SECRET_PROJECT_TOKEN!
);
export default supabaseClient;
