import { Router } from 'express';
import financialController from '../controllers/financial.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/v1/financial/statement
 * @desc    Get income statement for a period
 * @access  Private
 * @query   periodType: daily | weekly | monthly | quarterly | annual
 * @query   startDate: ISO date string (optional, overrides periodType)
 * @query   endDate: ISO date string (optional, overrides periodType)
 */
router.get('/statement', financialController.getIncomeStatement);

/**
 * @route   GET /api/v1/financial/cash-flow
 * @desc    Get cash flow analysis for a period
 * @access  Private
 * @query   periodType: daily | weekly | monthly | quarterly | annual
 * @query   startDate: ISO date string (optional, overrides periodType)
 * @query   endDate: ISO date string (optional, overrides periodType)
 */
router.get('/cash-flow', financialController.getCashFlowAnalysis);

/**
 * @route   GET /api/v1/financial/tax-report
 * @desc    Generate tax report for a period
 * @access  Private
 * @query   periodType: daily | weekly | monthly | quarterly | annual
 * @query   startDate: ISO date string (optional, overrides periodType)
 * @query   endDate: ISO date string (optional, overrides periodType)
 */
router.get('/tax-report', financialController.getTaxReport);

/**
 * @route   GET /api/v1/financial/metrics
 * @desc    Get financial metrics and ratios
 * @access  Private
 * @query   periodType: daily | weekly | monthly | quarterly | annual
 * @query   startDate: ISO date string (optional, overrides periodType)
 * @query   endDate: ISO date string (optional, overrides periodType)
 */
router.get('/metrics', financialController.getFinancialMetrics);

/**
 * @route   GET /api/v1/financial/p-and-l
 * @desc    Get Profit & Loss statement
 * @access  Private
 * @query   periodType: daily | weekly | monthly | quarterly | annual
 * @query   startDate: ISO date string (optional, overrides periodType)
 * @query   endDate: ISO date string (optional, overrides periodType)
 */
router.get('/p-and-l', financialController.getProfitAndLoss);

/**
 * @route   POST /api/v1/financial/tax-categories
 * @desc    Create a new tax category
 * @access  Private
 * @body    name: string, percentage: number, description?: string
 */
router.post('/tax-categories', financialController.createTaxCategory);

/**
 * @route   GET /api/v1/financial/tax-categories
 * @desc    Get all tax categories for the user
 * @access  Private
 */
router.get('/tax-categories', financialController.getTaxCategories);

export default router;
