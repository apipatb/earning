import { Router } from 'express';
import {
  createComplianceRecord,
  getComplianceRecords,
  getComplianceStatus,
  createAuditLog,
  getAuditLogs,
  getAuditTrail,
  createCompliancePolicy,
  getCompliancePolicies,
  updateCompliancePolicy,
  reportViolation,
  getViolations,
  resolveViolation,
  setDataRetentionPolicy,
  getDataRetentionPolicies,
  generateComplianceReport,
  getComplianceReports,
  collectAuditEvidence,
  getAuditEvidence,
  getComplianceDashboard,
  getRegulatoryFrameworks,
} from '../controllers/compliance.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Compliance Tracking
router.post('/records', auth, createComplianceRecord);
router.get('/records', auth, getComplianceRecords);
router.get('/status', auth, getComplianceStatus);

// Audit Logs
router.post('/audit-logs', auth, createAuditLog);
router.get('/audit-logs', auth, getAuditLogs);
router.get('/audit-trail', auth, getAuditTrail);

// Compliance Policies
router.post('/policies', auth, createCompliancePolicy);
router.get('/policies', auth, getCompliancePolicies);
router.put('/policies/:policyId', auth, updateCompliancePolicy);

// Compliance Violations
router.post('/violations', auth, reportViolation);
router.get('/violations', auth, getViolations);
router.put('/violations/:violationId/resolve', auth, resolveViolation);

// Data Retention Policies
router.post('/retention-policies', auth, setDataRetentionPolicy);
router.get('/retention-policies', auth, getDataRetentionPolicies);

// Compliance Reports
router.post('/reports/generate', auth, generateComplianceReport);
router.get('/reports', auth, getComplianceReports);

// Audit Evidence
router.post('/evidence', auth, collectAuditEvidence);
router.get('/evidence', auth, getAuditEvidence);

// Compliance Dashboard
router.get('/dashboard', auth, getComplianceDashboard);

// Regulatory Frameworks
router.get('/frameworks', getRegulatoryFrameworks);

export default router;
