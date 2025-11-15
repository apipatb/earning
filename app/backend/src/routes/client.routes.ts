import { Router } from 'express';
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  createVendor,
  getVendors,
  updateVendor,
  createCommunication,
  getCommunications,
  createContract,
  getContracts,
  getClientAnalytics,
  rateClient,
  getClientRatings,
  createSLA,
  getSLAs,
  getClientStatistics,
} from '../controllers/client.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Client Management
router.post('/clients', auth, createClient);
router.get('/clients', auth, getClients);
router.get('/clients/:clientId', auth, getClientById);
router.put('/clients/:clientId', auth, updateClient);
router.delete('/clients/:clientId', auth, deleteClient);

// Vendor Management
router.post('/vendors', auth, createVendor);
router.get('/vendors', auth, getVendors);
router.put('/vendors/:vendorId', auth, updateVendor);

// Communication History
router.post('/communications', auth, createCommunication);
router.get('/communications', auth, getCommunications);

// Contract Management
router.post('/contracts', auth, createContract);
router.get('/contracts', auth, getContracts);

// Client Ratings
router.post('/clients/:clientId/rate', auth, rateClient);
router.get('/ratings', auth, getClientRatings);

// Service Level Agreements
router.post('/slas', auth, createSLA);
router.get('/slas', auth, getSLAs);

// Analytics & Statistics
router.get('/analytics', auth, getClientAnalytics);
router.get('/statistics', auth, getClientStatistics);

export default router;
