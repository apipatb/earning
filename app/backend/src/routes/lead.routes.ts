import { Router } from 'express';
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  updateLeadScore,
  updateLeadStatus,
  addLeadCommunication,
  getLeadCommunications,
  addLeadActivity,
  getLeadActivities,
  getSalesPipeline,
  getLeadSources,
  getLeadAnalytics,
  getLeadStatistics,
  convertLeadToClient,
  getLeadSegments,
} from '../controllers/lead.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Lead Management
router.post('/leads', auth, createLead);
router.get('/leads', auth, getLeads);
router.get('/leads/:leadId', auth, getLeadById);
router.put('/leads/:leadId', auth, updateLead);
router.delete('/leads/:leadId', auth, deleteLead);
router.put('/leads/:leadId/score', auth, updateLeadScore);
router.put('/leads/:leadId/status', auth, updateLeadStatus);

// Lead Communications
router.post('/leads/:leadId/communications', auth, addLeadCommunication);
router.get('/communications', auth, getLeadCommunications);

// Lead Activities
router.post('/leads/:leadId/activities', auth, addLeadActivity);
router.get('/activities', auth, getLeadActivities);

// Sales Pipeline & Analytics
router.get('/pipeline', auth, getSalesPipeline);
router.get('/sources', auth, getLeadSources);
router.get('/analytics', auth, getLeadAnalytics);
router.get('/statistics', auth, getLeadStatistics);
router.get('/segments', auth, getLeadSegments);

// Lead Conversion
router.post('/leads/:leadId/convert', auth, convertLeadToClient);

export default router;
