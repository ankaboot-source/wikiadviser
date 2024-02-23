import { createServerClient } from '@supabase/ssr';
import { Logger } from 'pino';
import { Request } from 'express';
import Authorization from './AuthResolver';
import supabaseClient from '../../api/supabase';

export default class SupabaseAuthorization implements Authorization {
  private readonly jwtKey = 'x-sb-jwt';

  constructor(private readonly logger: Logger) {}

  async verifyToken(context: Request) {
    try {
      const token = context.header(this.jwtKey);
      const { data } = await supabaseClient.auth.getUser(token);
      return data?.user;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async verifyCookie(context: Request) {
    try {
      const supabase = createServerClient(
        // skipcq: JS-0339 - Skip this issue until we migrate to zod for ENV checking
        process.env.SUPABASE_PROJECT_URL!,
        // skipcq: JS-0339 - Skip this issue until we migrate to zod for ENV checking
        process.env.SUPABASE_SECRET_PROJECT_TOKEN!,
        {
          cookies: {
            get: (key: string): string => {
              const { cookies } = context;
              const cookie = cookies[key] ?? '';
              return decodeURIComponent(cookie);
            }
          }
        }
      );
      const { data } = await supabase.auth.getSession();
      return data?.session?.user ?? null;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
