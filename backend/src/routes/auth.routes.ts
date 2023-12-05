import { Router } from 'express';
import restrictMediawikiAccess from '../controllers/auth.controller';

const authRouter = Router();

authRouter.get('/auth/mediawiki', restrictMediawikiAccess);

export default authRouter;
