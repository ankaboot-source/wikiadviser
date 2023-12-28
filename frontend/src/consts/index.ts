export const EXPIRATION_DAYS = process.env.DAY_LIMIT
  ? parseInt(process.env.DAY_LIMIT)
  : 2;
