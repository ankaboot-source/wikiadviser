import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'pino';
import { Request } from 'express';
import { WikiAdviserJWTcookie } from '../../types';
import Authorization from './AuthResolver';

export default class WikiAdviserSupabaseAuthorization implements Authorization {
  private readonly key: WikiAdviserJWTcookie['name'] = 'WikiAdviserJWTcookie';

  constructor(
    private readonly client: SupabaseClient,
    private readonly logger: Logger
  ) {}

  async verifyJWt(accessToken: string) {
    try {
      const { data } = await this.client.auth.getUser(accessToken);
      return data?.user;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async verifyCookie(context: Request) {
    try {
      const { cookies } = context;
      const accessToken = decodeURIComponent(cookies[this.key] ?? '');
      const user = await this.verifyJWt(accessToken);
      return user ?? undefined;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
