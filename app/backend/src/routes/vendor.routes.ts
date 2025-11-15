import express from 'express';
import { auth } from '../middleware/auth.middleware';
import {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  createPurchaseOrder,
  getPurchaseOrders,
  updatePurchaseOrder,
  createVendorInvoice,
  getVendorInvoices,
  updateVendorInvoice,
  createVendorRating,
  getVendorRatings,
  createPerformanceMetric,
  getPerformanceMetrics,
  getProcurementAnalytics,
  getProcurementStatistics,
  getTopVendors,
} from '../controllers/vendor.controller';

const router = express.Router();

// Vendor CRUD
router.post('/vendors', auth, createVendor);
router.get('/vendors', auth, getVendors);
router.get('/vendors/:vendorId', auth, getVendorById);
router.put('/vendors/:vendorId', auth, updateVendor);
router.delete('/vendors/:vendorId', auth, deleteVendor);

// Purchase Orders
router.post('/vendors/:vendorId/purchase-orders', auth, createPurchaseOrder);
router.get('/purchase-orders', auth, getPurchaseOrders);
router.put('/purchase-orders/:poId', auth, updatePurchaseOrder);

// Vendor Invoices
router.post('/vendors/:vendorId/invoices', auth, createVendorInvoice);
router.get('/invoices', auth, getVendorInvoices);
router.put('/invoices/:invoiceId', auth, updateVendorInvoice);

// Vendor Ratings
router.post('/vendors/:vendorId/ratings', auth, createVendorRating);
router.get('/vendors/:vendorId/ratings', auth, getVendorRatings);

// Performance Metrics
router.post('/vendors/:vendorId/performance', auth, createPerformanceMetric);
router.get('/vendors/:vendorId/performance', auth, getPerformanceMetrics);

// Analytics & Reporting
router.get('/analytics', auth, getProcurementAnalytics);
router.get('/statistics', auth, getProcurementStatistics);
router.get('/top-vendors', auth, getTopVendors);

export default router;
