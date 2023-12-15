import { Router } from 'express';
import restrictMediawikiAccess, {
  deleteUser
} from '../controllers/auth.controller';

const authRouter = Router();

authRouter.get('/auth/mediawiki', restrictMediawikiAccess);
authRouter.delete('/auth/:id', deleteUser);

export default authRouter;
