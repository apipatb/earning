import { Router } from 'express';
import {
  createPlugin,
  listMarketplacePlugins,
  getPluginDetails,
  installPlugin,
  uninstallPlugin,
  getInstalledPlugins,
  updatePluginConfig,
  reviewPlugin,
  getPluginReviews,
  getPublisherPlugins,
  publishPlugin,
  getMarketplaceStats,
} from '../controllers/marketplace.controller';
import { auth } from '../middleware/auth.middleware';
import { requirePaidTier } from '../middleware/tier.middleware';

const router = Router();

// Public marketplace routes
router.get('/plugins', listMarketplacePlugins);
router.get('/plugins/:pluginId', getPluginDetails);
router.get('/plugins/:pluginId/reviews', getPluginReviews);
router.get('/stats', getMarketplaceStats);

// Plugin management (authenticated)
router.post('/plugins', auth, requirePaidTier, createPlugin);
router.post('/plugins/:pluginId/publish', auth, publishPlugin);
router.get('/my-plugins', auth, getPublisherPlugins);

// Installation management
router.post('/plugins/:pluginId/install', auth, installPlugin);
router.delete('/plugins/:pluginId/uninstall', auth, uninstallPlugin);
router.get('/installed', auth, getInstalledPlugins);
router.put('/plugins/:pluginId/config', auth, updatePluginConfig);

// Reviews
router.post('/plugins/:pluginId/review', auth, reviewPlugin);

export default router;
