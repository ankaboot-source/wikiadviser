import { Cookies } from 'quasar';
import { CookieOptions } from '@supabase/ssr';

const SupabaseCookiesStore = {
  set(key: string, value: string, options: CookieOptions) {
    if (value.includes('user:')) {
      const cookie = JSON.parse(value);
      cookie.user = {
        id: cookie.user.id,
      };
      Cookies.set(key, JSON.stringify(cookie), options);
    } else {
      Cookies.set(key, value, options);
    }
  },

  get(key: string) {
    return Cookies.get(key);
  },

  remove(key: string, options: CookieOptions) {
    Cookies.remove(key, options);
  },
};

export default SupabaseCookiesStore;
