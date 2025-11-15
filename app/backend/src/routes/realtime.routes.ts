import { Router } from 'express';
import {
  initializeRealtimeConnection,
  heartbeat,
  closeConnection,
  setUserPresence,
  getUserPresence,
  getMultiplePresences,
  createRealtimeAlert,
  getRealtimeAlerts,
  markAlertAsRead,
  acknowledgeAlert,
  subscribeToDataUpdates,
  getDataSubscriptions,
  unsubscribeFromDataUpdates,
  createLiveEvent,
  getLiveEvents,
  trackNotificationDelivery,
  getNotificationDeliveryStats,
  getActiveSessions,
  getRealtimeStats,
  clearOldConnections,
} from '../controllers/realtime.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Connection Management
router.post('/connections', auth, initializeRealtimeConnection);
router.put('/connections/:connectionId/heartbeat', auth, heartbeat);
router.post('/connections/:connectionId/close', auth, closeConnection);

// Presence Management
router.put('/presence', auth, setUserPresence);
router.get('/presence/:userId', getUserPresence);
router.post('/presence/batch', auth, getMultiplePresences);

// Real-time Alerts
router.post('/alerts', auth, createRealtimeAlert);
router.get('/alerts', auth, getRealtimeAlerts);
router.put('/alerts/:alertId/read', auth, markAlertAsRead);
router.put('/alerts/:alertId/acknowledge', auth, acknowledgeAlert);

// Data Subscriptions
router.post('/subscriptions', auth, subscribeToDataUpdates);
router.get('/subscriptions', auth, getDataSubscriptions);
router.delete('/subscriptions/:subscriptionId', auth, unsubscribeFromDataUpdates);

// Live Events
router.post('/events', auth, createLiveEvent);
router.get('/events', auth, getLiveEvents);

// Notification Delivery
router.post('/notifications/delivery', auth, trackNotificationDelivery);
router.get('/notifications/delivery/stats', auth, getNotificationDeliveryStats);

// Session & Stats
router.get('/sessions', auth, getActiveSessions);
router.get('/stats', auth, getRealtimeStats);
router.post('/cleanup', auth, clearOldConnections);

export default router;
