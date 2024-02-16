import { Cookies } from 'quasar';
import { CookieOptions } from '@supabase/ssr';

const SupabaseCookiesStore = {
  set(key: string, value: string, options: CookieOptions) {
    const cookie = JSON.parse(value);
    if (cookie?.user?.id) {
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

  remove(key: string) {
    Cookies.remove(key);
  },
};

export default SupabaseCookiesStore;
