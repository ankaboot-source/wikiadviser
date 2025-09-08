import ENV from 'src/schema/env.schema';

export const SHARE_LINK_DAY_LIMIT = ENV.SHARE_LINK_DAY_LIMIT;

export const MAX_EMAIL_LENGTH = 20;

export const HOURS_IN_DAY = 24;

export const WIKIADVISER_PRICING_PAGE =
  'https://www.wikiadviser.io/#oQgNgFoThyItKVpXykVyFzgOCQwFPVvfh';

export const AUTH_UI_VUE_VARIABLES_STYLE = {
  default: {
    fonts: {
      bodyFontFamily: 'Lexend Deca',
      buttonFontFamily: 'Lexend Deca',
      inputFontFamily: 'Lexend Deca',
      labelFontFamily: 'Lexend Deca',
    },
    colors: {
      brand: '#56564c' /* primary */,
      brandAccent: '#6d6d64' /* hover */,
      inputLabelText: '#263238' /* dark */,
      defaultButtonText: '#263238' /* dark */,
      messageTextDanger: '#b71c1c' /* negative */,
      messageText: '#1b5e20' /* positive */,
    },
  },
};
