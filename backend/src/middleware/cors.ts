import cors, { CorsOptions } from 'cors';

const corsOptions: CorsOptions = {
  origin: [
    process.env.WIKIADVISER_FRONTEND_ENDPOINT ?? 'https://app.wikiadviser.io',
    process.env.MEDIAWIKI_ENDPOINT ?? 'https://wiki.wikiadviser.io'
  ],
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204,
  credentials: true
};
const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
