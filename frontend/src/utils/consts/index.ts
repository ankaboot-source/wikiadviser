export const EXPIRATION_DAYS = process.env.DAY_LIMIT
  ? parseInt(process.env.DAY_LIMIT)
  : 2;

export const DEFAULT_AVATAR_URL = process.env.DEFAULT_AVATAR_URL
  ? process.env.DEFAULT_AVATAR_URL
  : 'https://ui-avatars.com/api/';
