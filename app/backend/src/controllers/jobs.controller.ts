import { Response } from 'express';
import { AuthRequest } from '../types';
import { scheduler } from '../jobs/scheduler';
import logger from '../lib/logger';
import { z } from 'zod';

// Validation schemas
const runJobSchema = z.object({
  name: z.string().min(1),
});

const getJobLogsSchema = z.object({
  name: z.string().min(1),
  limit: z.coerce.number().int().positive().default(10),
});

export class JobsController {
  /**
   * GET /api/jobs
   * Get all job statuses
   */
  static async getJobStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const jobs = await scheduler.getJobStatuses();

      res.json({
        success: true,
        data: jobs,
        message: `Retrieved ${jobs.length} jobs`,
      });
    } catch (error) {
      logger.error('Failed to get job status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve job status',
      });
    }
  }

  /**
   * POST /api/jobs/:name/run
   * Manually trigger a job
   */
  static async runJobNow(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      // Validate job name
      const validation = runJobSchema.safeParse({ name });
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid job name',
          details: validation.error.errors,
        });
        return;
      }

      logger.info(`Manual trigger requested for job: ${name}`);

      // Run the job
      await scheduler.runJobNow(name);

      res.json({
        success: true,
        message: `Job '${name}' executed successfully`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Job not found')) {
        res.status(404).json({
          success: false,
          error: errorMessage,
        });
      } else {
        logger.error('Failed to run job:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to execute job',
        });
      }
    }
  }

  /**
   * GET /api/jobs/:name/logs
   * Get job logs
   */
  static async getJobLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { limit } = req.query;

      // Validate input
      const validation = getJobLogsSchema.safeParse({
        name,
        limit: limit || 10,
      });

      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          details: validation.error.errors,
        });
        return;
      }

      const logs = await scheduler.getJobLogs(name, validation.data.limit);

      res.json({
        success: true,
        data: logs,
        message: `Retrieved ${logs.length} logs for job '${name}'`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Job not found')) {
        res.status(404).json({
          success: false,
          error: errorMessage,
        });
      } else {
        logger.error('Failed to get job logs:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve job logs',
        });
      }
    }
  }

  /**
   * POST /api/jobs/:name/disable
   * Disable a job
   */
  static async disableJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      const validation = runJobSchema.safeParse({ name });
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid job name',
          details: validation.error.errors,
        });
        return;
      }

      logger.info(`Disable requested for job: ${name}`);
      await scheduler.disableJob(name);

      res.json({
        success: true,
        message: `Job '${name}' has been disabled`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Job not found')) {
        res.status(404).json({
          success: false,
          error: errorMessage,
        });
      } else {
        logger.error('Failed to disable job:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to disable job',
        });
      }
    }
  }

  /**
   * POST /api/jobs/:name/enable
   * Enable a job
   */
  static async enableJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      const validation = runJobSchema.safeParse({ name });
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid job name',
          details: validation.error.errors,
        });
        return;
      }

      logger.info(`Enable requested for job: ${name}`);
      await scheduler.enableJob(name);

      res.json({
        success: true,
        message: `Job '${name}' has been enabled`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Job not found')) {
        res.status(404).json({
          success: false,
          error: errorMessage,
        });
      } else {
        logger.error('Failed to enable job:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to enable job',
        });
      }
    }
  }
}
