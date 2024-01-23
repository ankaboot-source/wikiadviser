import { Router } from 'express';
import {
  createArticle,
  deleteArticle,
  deleteArticleRevision,
  hasPermissions,
  importArticle,
  updateArticleChanges
} from '../controllers/article.controller';

const articleRouter = Router();

/* Articles */
articleRouter.post('/article', createArticle);
articleRouter.post('/article/import', importArticle);

/* Revisions */
articleRouter.delete(
  '/article/:id/revisions/:revId',
  hasPermissions(['owner']),
  deleteArticleRevision
);

articleRouter.delete('/article/:id', hasPermissions(['owner']), deleteArticle);

articleRouter.put(
  '/article/:id/changes',
  hasPermissions(['owner', 'editor']),
  updateArticleChanges
);

export default articleRouter;
