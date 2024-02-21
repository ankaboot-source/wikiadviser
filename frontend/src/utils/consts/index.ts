export const EXPIRATION_DAYS = process.env.SHARE_LINK_DAY_LIMIT
  ? parseInt(process.env.SHARE_LINK_DAY_LIMIT)
  : 2;

export const MAX_TITLE_LENGTH = process.env.MAX_TITLE_LENGTH
  ? parseInt(process.env.MAX_TITLE_LENGTH)
  : 256;

export const MAX_EMAIL_LENGTH = 20;

export const HOURS_IN_DAY = 24;

export const WIKIADVISER_PRICING_PAGE =
  'https://www.wikiadviser.io/#oQgNgFoThyItKVpXykVyFzgOCQwFPVvfh';
