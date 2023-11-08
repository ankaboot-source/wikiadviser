import { createClient } from '@supabase/supabase-js';

const supabaseClient = createClient(
  // skipcq: JS-0339 - Skip this issue until we migrate to zod for ENV checking 
  process.env.SUPABASE_PROJECT_URL!,
  // skipcq: JS-0339 - Skip this issue until we migrate to zod for ENV checking 
  process.env.SUPABASE_SECRET_PROJECT_TOKEN!
);
export default supabaseClient;
