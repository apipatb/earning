import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
  exportReport,
  scheduleReport,
  getReportSnapshots,
  createReportSnapshot,
} from '../controllers/report.controller';

const router = Router();

router.use(authenticate);

// Report CRUD
router.get('/', getReports);
router.get('/:id', getReport);
router.post('/', createReport);
router.put('/:id', updateReport);
router.delete('/:id', deleteReport);

// Report actions
router.get('/:id/export', exportReport);
router.post('/:id/schedule', scheduleReport);
router.get('/:id/snapshots', getReportSnapshots);
router.post('/:id/snapshots', createReportSnapshot);

export default router;
