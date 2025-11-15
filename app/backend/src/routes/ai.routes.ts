import { Router } from 'express';
import {
  getAIInsights,
  getSmartRecommendations,
  getAnomalyDetection,
  getPredictiveAnalysis,
  saveInsight,
  getSavedInsights,
} from '../controllers/ai.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// AI Insights routes
router.get('/insights', auth, getAIInsights);
router.get('/recommendations', auth, getSmartRecommendations);
router.get('/anomalies', auth, getAnomalyDetection);
router.get('/forecast', auth, getPredictiveAnalysis);

// Save and retrieve insights
router.post('/insights/save', auth, saveInsight);
router.get('/insights/saved', auth, getSavedInsights);

export default router;
