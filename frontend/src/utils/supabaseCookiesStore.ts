import { Cookies } from 'quasar';
import { CookieOptions } from '@supabase/ssr';

const SB_COOKIE_SIGNATURE_REGEX = /^(sb-.+?auth)/;

const SupabaseCookiesStore = {
  set(key: string, value: string, options: CookieOptions) {
    try {
      Cookies.set(key, value, options);
      /**
       * Remove Supabase cookies from other environments
       */
      const currentSupabaseSignature = key.match(SB_COOKIE_SIGNATURE_REGEX);
      Object.keys(Cookies.getAll()).forEach((cookieKey) => {
        const sbSignature = cookieKey.match(SB_COOKIE_SIGNATURE_REGEX);
        if (
          sbSignature &&
          currentSupabaseSignature &&
          sbSignature[1] !== currentSupabaseSignature[1]
        ) {
          Cookies.remove(cookieKey, options);
        }
      });
    } catch (e) {
      console.error(e);
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
