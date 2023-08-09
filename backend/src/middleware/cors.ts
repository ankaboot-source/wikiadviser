import cors, { CorsOptions } from 'cors';

const corsOptions: CorsOptions = {
  origin: process.env.WIKIADVISER_FRONTEND_HOST ?? 'https://app.wikiadviser.io',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204,
};
const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
