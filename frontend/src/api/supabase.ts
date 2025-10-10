import { Cookies } from 'quasar';
import { createBrowserClient, CookieOptions } from '@supabase/ssr';
import ENV from 'src/schema/env.schema';
import { Database } from 'src/types';

const supabaseClient = createBrowserClient<Database>(
  ENV.SUPABASE_PROJECT_URL,
  ENV.SUPABASE_SECRET_PROJECT_TOKEN,
  {
    cookies: {
      get(name: string) {
        return Cookies.get(name);
      },
      set(name: string, value: string, options: CookieOptions) {
        Cookies.set(name, value, {
          ...options,
          secure: true,
          sameSite: 'Lax',
          path: '/',
          expires: options.maxAge
            ? new Date(Date.now() + options.maxAge * 1000)
            : undefined,
        });
      },
      remove(name: string, options: CookieOptions) {
        Cookies.remove(name, {
          ...options,
          path: '/',
        });
      },
    },
  },
);

export default supabaseClient;
