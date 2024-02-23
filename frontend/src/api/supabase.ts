import { Cookies } from 'quasar';
import { createBrowserClient } from '@supabase/ssr';

const supabaseClient = createBrowserClient(
  process.env.SUPABASE_PROJECT_URL!,
  process.env.SUPABASE_SECRET_PROJECT_TOKEN!,
  {
    cookies: Cookies,
    cookieOptions: {
      secure: true,
    },
  },
);

export default supabaseClient;
