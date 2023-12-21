import { Router } from 'express';
import {
  createArticle,
  getParsedArticle,
  deleteArticle,
  getArticleChanges,
  updateArticleChanges,
  hasPermissions,
  createSharedLink,
  validateLink
} from '../controllers/article.controller';

const articleRouter = Router();

articleRouter.post('/article', createArticle);
articleRouter.get(
  '/article/:id',
  hasPermissions(['viewer', 'reviewer', 'owner', 'editor']),
  getParsedArticle
);
articleRouter.delete('/article/:id', hasPermissions(['owner']), deleteArticle);

articleRouter.get(
  '/article/:id/changes',
  hasPermissions(['viewer', 'reviewer', 'owner', 'editor']),
  getArticleChanges
);
articleRouter.put(
  '/article/:id/changes',
  hasPermissions(['owner', 'editor']),
  updateArticleChanges
);

articleRouter.post(
  '/article/:id/share',
  hasPermissions(['reviewer', 'owner', 'editor']),
  createSharedLink
);

articleRouter.get('/share/:id', validateLink);

export default articleRouter;
