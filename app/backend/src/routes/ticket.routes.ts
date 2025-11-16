import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  addComment,
  assignTicket,
  closeTicket,
  bulkOperation,
  getTicketStats,
  runSLACheck,
} from '../controllers/ticket.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Ticket routes
router.get('/', getAllTickets);
router.get('/stats', getTicketStats);
router.get('/:id', getTicketById);
router.post('/', createTicket);
router.put('/:id', updateTicket);

// Ticket actions
router.post('/:id/comments', addComment);
router.post('/:id/assign', assignTicket);
router.post('/:id/close', closeTicket);

// Bulk operations
router.post('/bulk', bulkOperation);

// Admin/maintenance routes
router.post('/sla-check', runSLACheck);

export default router;
