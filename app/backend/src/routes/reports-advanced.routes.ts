import { Router } from 'express';
import {
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  generateReportData,
  getReportExecutions,
  shareReport,
  createVisualization,
  getVisualizations,
  deleteVisualization,
  getChartData,
  batchExportReports,
  getReportTemplates,
  createFromTemplate,
} from '../controllers/reports-advanced.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Report CRUD
router.post('/', auth, createReport);
router.get('/', auth, getReports);
router.get('/templates', getReportTemplates);
router.get('/:reportId', auth, getReportById);
router.put('/:reportId', auth, updateReport);
router.delete('/:reportId', auth, deleteReport);

// Report Generation & Execution
router.get('/:reportId/generate', auth, generateReportData);
router.get('/:reportId/executions', auth, getReportExecutions);

// Report Sharing
router.post('/:reportId/share', auth, shareReport);

// Batch Operations
router.post('/batch/export', auth, batchExportReports);

// Template Operations
router.post('/templates/create', auth, createFromTemplate);

// Chart Visualizations
router.post('/visualizations', auth, createVisualization);
router.get('/visualizations', auth, getVisualizations);
router.delete('/visualizations/:vizId', auth, deleteVisualization);
router.get('/visualizations/:vizId/data', auth, getChartData);

export default router;
