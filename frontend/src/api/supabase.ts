import { Cookies } from 'quasar';
import { createBrowserClient, CookieOptions } from '@supabase/ssr';
import ENV from 'src/schema/env.schema';
import { Database } from 'src/types';
import { createMockSupabaseClient } from './supabase.mock';

const realClient = createBrowserClient<Database>(
  ENV.SUPABASE_PROJECT_URL,
  ENV.SUPABASE_ANON_KEY,
  {
    cookies: {
      get(name: string) {
        return Cookies.get(name);
      },
      set(name: string, value: string, options: CookieOptions) {
        Cookies.set(name, value, {
          ...options,
          // Secure only over HTTPS. Dev runs on plain HTTP localhost, where a
          // `secure` cookie is rejected by the browser and breaks auth.
          secure: window.location.protocol === 'https:',
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

// When USE_MOCK_BACKEND=true (UI verification / screenshots), swap in a mock
// client that returns a dummy session + dummy data so pages render without a
// live Supabase backend.
const supabaseClient = ENV.USE_MOCK_BACKEND
  ? (createMockSupabaseClient() as unknown as typeof realClient)
  : realClient;

export default supabaseClient;
