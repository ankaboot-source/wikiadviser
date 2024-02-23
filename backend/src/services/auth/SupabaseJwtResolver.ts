import { Logger } from 'pino';
import { Request } from 'express';
import Authorization from './AuthResolver';
import supabase from '../../api/supabase';

export default class SupabaseJwtAuthorization implements Authorization {
  private readonly jwtKey = 'x-sb-jwt';

  constructor(private readonly logger: Logger) {}

  async verifyToken(context: Request) {
    try {
      const token = context.header(this.jwtKey);
      const { data } = await supabase.auth.getUser(token);
      return data?.user;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
