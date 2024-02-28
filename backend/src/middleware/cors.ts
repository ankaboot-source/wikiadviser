import cors, { CorsOptions } from 'cors';
import ENV from '../schema/env.schema';

const corsOptions: CorsOptions = {
  origin: [ENV.WIKIADVISER_FRONTEND_ENDPOINT, ENV.MEDIAWIKI_ENDPOINT],
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204,
  credentials: true
};
const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
