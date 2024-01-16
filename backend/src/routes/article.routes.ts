import { Router } from 'express';
import {
  createArticle,
  deleteArticle,
  deleteArticleRevision,
  getArticleChanges,
  getParsedArticle,
  hasPermissions,
  importArticle,
  updateArticleChanges
} from '../controllers/article.controller';

const articleRouter = Router();

/* Articles */
articleRouter.post('/article', (req, res) => {
  const { isNew, ...otherParams } = req.body;
  if (isNew) {
    createArticle(req, res, otherParams);
  } else {
    importArticle(req, res, otherParams);
  }
});

articleRouter.get(
  '/article/:id',
  hasPermissions(['viewer', 'reviewer', 'owner', 'editor']),
  getParsedArticle
);

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
