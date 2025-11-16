import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAuditLogs,
  searchAuditLogs,
  generateAuditReport,
  getComplianceReports,
  getComplianceReportDetails,
  generateComplianceReport,
  exportUserData,
  getAuditStats,
  cleanupOldLogs,
} from '../controllers/audit.controller';

const router = Router();

// All audit routes require authentication
router.use(authenticate);

// Audit Logs
router.get('/logs', getAuditLogs);
router.get('/logs/search', searchAuditLogs);
router.get('/report', generateAuditReport);
router.get('/stats', getAuditStats);

// Compliance Reports
router.get('/compliance/reports', getComplianceReports);
router.get('/compliance/reports/:id', getComplianceReportDetails);
router.post('/compliance/export', generateComplianceReport);
router.post('/compliance/data-export', exportUserData);

// Cleanup (admin only - should add role check)
router.delete('/cleanup', cleanupOldLogs);

export default router;
