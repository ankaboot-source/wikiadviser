import { Router } from 'express';
import {
  createArticle,
  getParsedArticle,
  deleteArticle,
  getArticleChanges,
  updateArticleChanges,
  hasPermissions,
  deleteArticleChange
} from '../controllers/article.controller';

const articleRouter = Router();

/* Articles */
articleRouter.post('/article', createArticle);
articleRouter.get(
  '/article/:id',
  hasPermissions(['viewer', 'reviewer', 'owner', 'editor']),
  getParsedArticle
);
articleRouter.delete('/article/:id', hasPermissions(['owner']), deleteArticle);

/* Changes */
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

articleRouter.delete(
  '/article/:id/changes/:changeId',
  hasPermissions(['owner']),
  deleteArticleChange
);

export default articleRouter;
