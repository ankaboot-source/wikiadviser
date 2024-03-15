import { Cookies } from 'quasar';
import { createBrowserClient } from '@supabase/ssr';
import ENV from 'src/schema/env.schema';
import { Database } from 'src/types';

const supabaseClient = createBrowserClient<Database>(
  ENV.SUPABASE_PROJECT_URL,
  ENV.SUPABASE_SECRET_PROJECT_TOKEN,
  {
    cookies: Cookies,
    cookieOptions: {
      secure: true,
    },
  },
);

export default supabaseClient;
