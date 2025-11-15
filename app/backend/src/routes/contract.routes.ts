import express from 'express';
import { auth } from '../middleware/auth.middleware';
import {
  createContract,
  getContracts,
  getContractById,
  updateContract,
  deleteContract,
  createMilestone,
  getMilestones,
  updateMilestone,
  createSignature,
  getSignatures,
  createPayment,
  getPayments,
  uploadDocument,
  getDocuments,
  createRenewal,
  getRenewals,
  createAmendment,
  getAmendments,
  getContractAnalytics,
  getContractStatistics,
} from '../controllers/contract.controller';

const router = express.Router();

// Contract CRUD
router.post('/contracts', auth, createContract);
router.get('/contracts', auth, getContracts);
router.get('/contracts/:contractId', auth, getContractById);
router.put('/contracts/:contractId', auth, updateContract);
router.delete('/contracts/:contractId', auth, deleteContract);

// Milestones
router.post('/contracts/:contractId/milestones', auth, createMilestone);
router.get('/contracts/:contractId/milestones', auth, getMilestones);
router.put('/milestones/:milestoneId', auth, updateMilestone);

// Signatures
router.post('/contracts/:contractId/signatures', auth, createSignature);
router.get('/contracts/:contractId/signatures', auth, getSignatures);

// Payments
router.post('/contracts/:contractId/payments', auth, createPayment);
router.get('/contracts/:contractId/payments', auth, getPayments);

// Documents
router.post('/contracts/:contractId/documents', auth, uploadDocument);
router.get('/contracts/:contractId/documents', auth, getDocuments);

// Renewals
router.post('/contracts/:contractId/renewals', auth, createRenewal);
router.get('/contracts/:contractId/renewals', auth, getRenewals);

// Amendments
router.post('/contracts/:contractId/amendments', auth, createAmendment);
router.get('/contracts/:contractId/amendments', auth, getAmendments);

// Analytics
router.get('/analytics', auth, getContractAnalytics);
router.get('/statistics', auth, getContractStatistics);

export default router;
