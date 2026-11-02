import express from 'express';
import { protect } from '../middleware/auth';
import {
    listNewsArticles,
    getNewsArticle,
    createNewsArticle,
    getTrendingTopics,
    getExternalNews,
    getLivePulse
} from '../controllers/newsController';

const router = express.Router();

router.get('/', listNewsArticles);
router.get('/external', getExternalNews);
router.get('/trending', getTrendingTopics);
router.get('/pulse', getLivePulse);
router.get('/:id', getNewsArticle);
router.post('/', protect, createNewsArticle);

export default router;
