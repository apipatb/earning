import { Router } from 'express';
import PushNotificationController from '../controllers/push.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/notifications/vapid-key
 * @desc Get VAPID public key for push notifications
 * @access Public
 */
router.get('/vapid-key', PushNotificationController.getVapidPublicKey);

/**
 * @route POST /api/v1/notifications/subscribe
 * @desc Register a push subscription
 * @access Private
 */
router.post('/subscribe', PushNotificationController.subscribe);

/**
 * @route DELETE /api/v1/notifications/unsubscribe
 * @desc Unsubscribe from push notifications
 * @access Private
 */
router.delete('/unsubscribe', PushNotificationController.unsubscribe);

/**
 * @route GET /api/v1/notifications
 * @desc Get user's notifications
 * @access Private
 */
router.get('/', PushNotificationController.getNotifications);

/**
 * @route GET /api/v1/notifications/unread-count
 * @desc Get unread notification count
 * @access Private
 */
router.get('/unread-count', PushNotificationController.getUnreadCount);

/**
 * @route GET /api/v1/notifications/statistics
 * @desc Get notification statistics
 * @access Private
 */
router.get('/statistics', PushNotificationController.getStatistics);

/**
 * @route GET /api/v1/notifications/preferences
 * @desc Get user's notification preferences
 * @access Private
 */
router.get('/preferences', PushNotificationController.getPreferences);

/**
 * @route PUT /api/v1/notifications/preferences
 * @desc Update notification preferences
 * @access Private
 */
router.put('/preferences', PushNotificationController.updatePreferences);

/**
 * @route PUT /api/v1/notifications/:id/read
 * @desc Mark a notification as read
 * @access Private
 */
router.put('/:id/read', PushNotificationController.markAsRead);

/**
 * @route PUT /api/v1/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private
 */
router.put('/read-all', PushNotificationController.markAllAsRead);

/**
 * @route POST /api/v1/notifications/send
 * @desc Send a test notification (development/testing)
 * @access Private
 */
router.post('/send', PushNotificationController.sendTestNotification);

/**
 * @route DELETE /api/v1/notifications/cleanup
 * @desc Clean up old notifications (admin only)
 * @access Private (Admin)
 */
router.delete('/cleanup', PushNotificationController.cleanupOldNotifications);

export default router;
