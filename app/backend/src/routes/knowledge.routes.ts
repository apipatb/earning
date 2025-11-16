import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  searchArticles,
  trackView,
  submitFeedback,
  getRelatedArticles,
  getPopularArticles,
  getRecentArticles,
  getAllTags,
  getSearchAnalytics,
} from '../controllers/knowledge.controller';

const router = Router();

// Public routes (no authentication required for reading)
router.get('/categories', getCategories);
router.get('/categories/:idOrSlug', getCategory);
router.get('/articles', getArticles);
router.get('/articles/:idOrSlug', getArticle);
router.post('/search', searchArticles);
router.get('/popular', getPopularArticles);
router.get('/recent', getRecentArticles);
router.get('/tags', getAllTags);
router.get('/articles/:id/related', getRelatedArticles);

// Authenticated routes
router.use(authenticate);

// Article interaction (requires authentication)
router.post('/articles/:id/view', trackView);
router.post('/articles/:id/feedback', submitFeedback);

// Admin routes (requires authentication - add admin check middleware as needed)
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.post('/articles', createArticle);
router.put('/articles/:id', updateArticle);
router.delete('/articles/:id', deleteArticle);

router.get('/analytics/search', getSearchAnalytics);

export default router;
