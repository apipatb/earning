import { Router } from 'express';
import {
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  generateReport,
  getReportExecutions,
  createReportTemplate,
  getReportTemplates,
  createDashboard,
  getDashboards,
  getDashboardById,
  updateDashboard,
  deleteDashboard,
  addDashboardWidget,
  getDashboardWidgets,
  updateDashboardWidget,
  deleteDashboardWidget,
  getReportAnalytics,
  getDashboardAnalytics,
  exportReportData,
  shareReport,
  getSharedReports,
  scheduleReportExecution,
  getScheduledReports,
} from '../controllers/report.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Custom Reports
router.post('/reports', auth, createReport);
router.get('/reports', auth, getReports);
router.get('/reports/:reportId', auth, getReportById);
router.put('/reports/:reportId', auth, updateReport);
router.delete('/reports/:reportId', auth, deleteReport);

// Report Generation & Execution
router.post('/reports/:reportId/generate', auth, generateReport);
router.get('/executions', auth, getReportExecutions);

// Report Templates
router.post('/templates', auth, createReportTemplate);
router.get('/templates', auth, getReportTemplates);

// Dashboard Management
router.post('/dashboards', auth, createDashboard);
router.get('/dashboards', auth, getDashboards);
router.get('/dashboards/:dashboardId', auth, getDashboardById);
router.put('/dashboards/:dashboardId', auth, updateDashboard);
router.delete('/dashboards/:dashboardId', auth, deleteDashboard);

// Dashboard Widgets
router.post('/widgets', auth, addDashboardWidget);
router.get('/widgets', auth, getDashboardWidgets);
router.put('/widgets/:widgetId', auth, updateDashboardWidget);
router.delete('/widgets/:widgetId', auth, deleteDashboardWidget);

// Report Sharing
router.post('/reports/:reportId/share', auth, shareReport);
router.get('/shared', auth, getSharedReports);

// Report Scheduling
router.post('/reports/:reportId/schedule', auth, scheduleReportExecution);
router.get('/schedules', auth, getScheduledReports);

// Data Export
router.post('/reports/:reportId/export', auth, exportReportData);

// Analytics
router.get('/analytics/reports', auth, getReportAnalytics);
router.get('/analytics/dashboards', auth, getDashboardAnalytics);

export default router;
