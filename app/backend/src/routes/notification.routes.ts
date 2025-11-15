import { Router } from 'express';
import {
  createAlertRule,
  getAlertRules,
  updateAlertRule,
  deleteAlertRule,
  sendNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  getNotificationStats,
} from '../controllers/notification.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Alert rule management
router.post('/rules', auth, createAlertRule);
router.get('/rules', auth, getAlertRules);
router.put('/rules/:ruleId', auth, updateAlertRule);
router.delete('/rules/:ruleId', auth, deleteAlertRule);

// Notification management
router.post('/send', auth, sendNotification);
router.get('/', auth, getNotifications);
router.put('/:notificationId/read', auth, markAsRead);
router.put('/read-all', auth, markAllAsRead);
router.delete('/:notificationId', auth, deleteNotification);

// Preferences
router.get('/preferences', auth, getPreferences);
router.put('/preferences', auth, updatePreferences);

// Stats
router.get('/stats', auth, getNotificationStats);

export default router;
