import { Response } from 'express';
import { AuthRequest } from '../types';
import financialService from '../services/financial.service';
import { logger } from '../utils/logger';

class FinancialController {
  /**
   * GET /api/v1/financial/statement
   * Get income statement for a specified period
   */
  async getIncomeStatement(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { periodType, startDate, endDate } = req.query;

      let start: Date;
      let end: Date;

      if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      } else {
        const period = financialService.getPeriodDates(
          (periodType as string) || 'monthly'
        );
        start = period.startDate;
        end = period.endDate;
      }

      const statement = await financialService.calculateIncomeStatement(
        userId,
        start,
        end
      );

      res.json({
        success: true,
        data: statement,
      });
    } catch (error) {
      logger.error('Error generating income statement', error as Error);
      res.status(500).json({
        error: 'Failed to generate income statement',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/financial/cash-flow
   * Get cash flow analysis for a specified period
   */
  async getCashFlowAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { periodType, startDate, endDate } = req.query;

      let start: Date;
      let end: Date;

      if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      } else {
        const period = financialService.getPeriodDates(
          (periodType as string) || 'monthly'
        );
        start = period.startDate;
        end = period.endDate;
      }

      const cashFlow = await financialService.calculateCashFlow(
        userId,
        start,
        end
      );

      res.json({
        success: true,
        data: cashFlow,
      });
    } catch (error) {
      logger.error('Error generating cash flow analysis', error as Error);
      res.status(500).json({
        error: 'Failed to generate cash flow analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/financial/tax-report
   * Generate tax report for a specified period
   */
  async getTaxReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { periodType, startDate, endDate } = req.query;

      let start: Date;
      let end: Date;

      if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      } else {
        const period = financialService.getPeriodDates(
          (periodType as string) || 'quarterly'
        );
        start = period.startDate;
        end = period.endDate;
      }

      const taxReport = await financialService.generateTaxReport(
        userId,
        start,
        end
      );

      res.json({
        success: true,
        data: taxReport,
      });
    } catch (error) {
      logger.error('Error generating tax report', error as Error);
      res.status(500).json({
        error: 'Failed to generate tax report',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/financial/metrics
   * Get financial metrics and ratios
   */
  async getFinancialMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { periodType, startDate, endDate } = req.query;

      let start: Date;
      let end: Date;

      if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      } else {
        const period = financialService.getPeriodDates(
          (periodType as string) || 'monthly'
        );
        start = period.startDate;
        end = period.endDate;
      }

      const metrics = await financialService.calculateFinancialMetrics(
        userId,
        start,
        end
      );

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Error calculating financial metrics', error as Error);
      res.status(500).json({
        error: 'Failed to calculate financial metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/financial/p-and-l
   * Get Profit & Loss statement
   */
  async getProfitAndLoss(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { periodType, startDate, endDate } = req.query;

      let start: Date;
      let end: Date;

      if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      } else {
        const period = financialService.getPeriodDates(
          (periodType as string) || 'monthly'
        );
        start = period.startDate;
        end = period.endDate;
      }

      const pandl = await financialService.generateProfitAndLoss(
        userId,
        start,
        end
      );

      res.json({
        success: true,
        data: pandl,
      });
    } catch (error) {
      logger.error('Error generating P&L statement', error as Error);
      res.status(500).json({
        error: 'Failed to generate P&L statement',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/financial/tax-categories
   * Create a new tax category
   */
  async createTaxCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { name, percentage, description } = req.body;

      if (!name || percentage === undefined) {
        res.status(400).json({
          error: 'Missing required fields: name and percentage',
        });
        return;
      }

      if (percentage < 0 || percentage > 100) {
        res.status(400).json({
          error: 'Percentage must be between 0 and 100',
        });
        return;
      }

      const taxCategory = await financialService.createTaxCategory(
        userId,
        name,
        percentage,
        description
      );

      res.status(201).json({
        success: true,
        data: taxCategory,
      });
    } catch (error) {
      logger.error('Error creating tax category', error as Error);
      res.status(500).json({
        error: 'Failed to create tax category',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/financial/tax-categories
   * Get all tax categories for the user
   */
  async getTaxCategories(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const categories = await financialService.getTaxCategories(userId);

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      logger.error('Error fetching tax categories', error as Error);
      res.status(500).json({
        error: 'Failed to fetch tax categories',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default new FinancialController();
