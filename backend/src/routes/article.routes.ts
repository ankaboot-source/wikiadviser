import { Router } from 'express';
import {
  createArticle,
  deleteArticle,
  getArticleChanges,
  updateArticleChanges,
  hasPermissions,
  deleteArticleRevision
} from '../controllers/article.controller';

const articleRouter = Router();

/* Articles */
articleRouter.post('/article', createArticle);

/* Revisions */
articleRouter.delete(
  '/article/:id/revisions/:revId',
  hasPermissions(['owner']),
  deleteArticleRevision
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

export default articleRouter;
