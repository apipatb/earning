import { Router, Request, Response, NextFunction } from 'express';
import { JobsController } from '../controllers/jobs.controller';
import { authenticate } from '../middleware/auth.middleware';
import { AuthRequest } from '../types';
import logger from '../lib/logger';

const router = Router();

/**
 * Middleware to check if user is admin
 * In a real application, you would check user role/permissions
 */
const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Check if user is authenticated
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
    return;
  }

  // Check if user is admin (you can implement proper role checking here)
  // For now, we'll check if there's an admin flag or permission
  const isAdmin = process.env.ADMIN_EMAILS?.split(',').includes(req.user.email);

  if (!isAdmin) {
    res.status(403).json({
      success: false,
      error: 'Forbidden - Admin access required',
    });
    return;
  }

  next();
};

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/jobs
 * List all scheduled jobs with their status
 * Protected: Admin only
 */
router.get('/', requireAdmin, (req: AuthRequest, res: Response, next: NextFunction) => {
  JobsController.getJobStatus(req, res).catch(next);
});

/**
 * POST /api/jobs/:name/run
 * Manually trigger a specific job
 * Protected: Admin only
 * Params:
 *   - name: Job name (e.g., 'weekly-summary', 'invoice-reminder')
 */
router.post('/:name/run', requireAdmin, (req: AuthRequest, res: Response, next: NextFunction) => {
  JobsController.runJobNow(req, res).catch(next);
});

/**
 * GET /api/jobs/:name/logs
 * Get execution logs for a specific job
 * Protected: Admin only
 * Params:
 *   - name: Job name
 * Query:
 *   - limit: Number of logs to return (default: 10, max: 100)
 */
router.get('/:name/logs', requireAdmin, (req: AuthRequest, res: Response, next: NextFunction) => {
  JobsController.getJobLogs(req, res).catch(next);
});

/**
 * POST /api/jobs/:name/disable
 * Disable a scheduled job
 * Protected: Admin only
 * Params:
 *   - name: Job name
 */
router.post(
  '/:name/disable',
  requireAdmin,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    JobsController.disableJob(req, res).catch(next);
  }
);

/**
 * POST /api/jobs/:name/enable
 * Enable a disabled job
 * Protected: Admin only
 * Params:
 *   - name: Job name
 */
router.post('/:name/enable', requireAdmin, (req: AuthRequest, res: Response, next: NextFunction) => {
  JobsController.enableJob(req, res).catch(next);
});

// Error handler for this router
router.use((err: any, req: AuthRequest, res: Response, next: NextFunction) => {
  logger.error('Job route error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

export default router;
