import { Router } from 'express';
import {
  createTimesheetEntry,
  getTimesheetEntries,
  updateTimesheetEntry,
  deleteTimesheetEntry,
  createTimesheet,
  getTimesheets,
  getTimesheetById,
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
  createTimeOff,
  getTimeOff,
  approveTimeOff,
  getTimeAnalytics,
  getBillableHours,
  generateTimesheetReport,
  getTimesheetStatistics,
  getWeeklySummary,
} from '../controllers/timesheet.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Timesheet Entry Management
router.post('/entries', auth, createTimesheetEntry);
router.get('/entries', auth, getTimesheetEntries);
router.put('/entries/:entryId', auth, updateTimesheetEntry);
router.delete('/entries/:entryId', auth, deleteTimesheetEntry);

// Timesheet Management
router.post('/timesheets', auth, createTimesheet);
router.get('/timesheets', auth, getTimesheets);
router.get('/timesheets/:timesheetId', auth, getTimesheetById);
router.put('/timesheets/:timesheetId/submit', auth, submitTimesheet);
router.put('/timesheets/:timesheetId/approve', auth, approveTimesheet);
router.put('/timesheets/:timesheetId/reject', auth, rejectTimesheet);

// Time Off Management
router.post('/time-off', auth, createTimeOff);
router.get('/time-off', auth, getTimeOff);
router.put('/time-off/:timeOffId/approve', auth, approveTimeOff);

// Analytics & Reports
router.get('/analytics', auth, getTimeAnalytics);
router.get('/billable-hours', auth, getBillableHours);
router.post('/reports/generate', auth, generateTimesheetReport);
router.get('/statistics', auth, getTimesheetStatistics);
router.get('/weekly-summary', auth, getWeeklySummary);

export default router;
