import { createBrowserClient } from '@supabase/ssr';
import SupabaseCookieStore from 'src/utils/supabaseCookiesStore';

const supabaseClient = createBrowserClient(
  process.env.SUPABASE_PROJECT_URL!,
  process.env.SUPABASE_SECRET_PROJECT_TOKEN!,
  {
    cookies: SupabaseCookieStore,
    cookieOptions: {
      domain: process.env.WIKIADVISER_ROOT_DOMAIN ?? 'localhost',
      secure: true,
    },
  },
);

export default supabaseClient;
