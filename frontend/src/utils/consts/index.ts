export const EXPIRATION_DAYS = process.env.SHARE_LINK_DAY_LIMIT
  ? parseInt(process.env.SHARE_LINK_DAY_LIMIT)
  : 2;
