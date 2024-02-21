import { Cookies } from 'quasar';
import { createBrowserClient } from '@supabase/ssr';

const supabaseClient = createBrowserClient(
  process.env.SUPABASE_PROJECT_URL!,
  process.env.SUPABASE_SECRET_PROJECT_TOKEN!,
  {
    cookies: Cookies,
    cookieOptions: {
      domain: process.env.WIKIADVISER_ROOT_DOMAIN ?? 'localhost',
      secure: true,
    },
  },
);

export default supabaseClient;
