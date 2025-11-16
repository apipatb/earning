import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createRoom,
  getRooms,
  getRoomById,
  getRoomMessages,
  sendMessage,
  markMessageAsRead,
  markRoomAsRead,
  getUnreadCount,
  joinRoom,
  leaveRoom,
  getRoomParticipants,
  searchMessages,
  deleteRoom,
} from '../controllers/live-chat.controller';

const router = Router();

// All live chat routes require authentication
router.use(authenticate);

// Room management
router.post('/rooms', createRoom);
router.get('/rooms', getRooms);
router.get('/rooms/:id', getRoomById);
router.delete('/rooms/:id', deleteRoom);

// Room actions
router.post('/rooms/:id/join', joinRoom);
router.post('/rooms/:id/leave', leaveRoom);
router.post('/rooms/:id/read', markRoomAsRead);
router.get('/rooms/:id/participants', getRoomParticipants);

// Messages
router.get('/rooms/:id/messages', getRoomMessages);
router.post('/messages', sendMessage);
router.post('/messages/:id/read', markMessageAsRead);
router.get('/rooms/:id/search', searchMessages);

// Unread count
router.get('/unread', getUnreadCount);

export default router;
