import cors, { CorsOptions } from 'cors';

const corsOptions: CorsOptions = {
  origin: [
    process.env.WIKIADVISER_FRONTEND_HOST ?? 'https://app.wikiadviser.io'
  ],
  methods: 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
  allowedHeaders: [
    'Authorization',
    'X-Requested-With',
    'Content-type',
    'x-sb-jwt'
  ],
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204,
  credentials: true
};
const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
