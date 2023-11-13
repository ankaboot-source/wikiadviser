import { User } from '@supabase/supabase-js';
import { Request } from 'express';

export default interface Authorization {
  verifyCookie(context: Request): Promise<User | undefined>;
  verifyToken?(accessToken: string): Promise<User | undefined>;
}
