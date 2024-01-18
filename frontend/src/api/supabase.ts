import { createBrowserClient } from '@supabase/ssr';
import { Cookies } from 'quasar';

const supabaseClient = createBrowserClient(
  process.env.SUPABASE_PROJECT_URL!,
  process.env.SUPABASE_SECRET_PROJECT_TOKEN!,
  {
    cookies: Cookies,
    cookieOptions: {
      domain: process.env.WIKIADVISER_ROOT_DOMAIN ?? 'localhost',
      secure: true,
    },
  }
);

export default supabaseClient;
