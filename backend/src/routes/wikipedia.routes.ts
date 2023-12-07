import { Router } from 'express';
import getWikipediaArticle from '../controllers/wikipedia.controller';

const wikipediaRouter = Router();

wikipediaRouter.get('/wikipedia/articles', getWikipediaArticle);

export default wikipediaRouter;
