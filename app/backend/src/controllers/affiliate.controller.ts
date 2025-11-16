import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { AffiliateService } from '../services/affiliate.service';
import { logger } from '../utils/logger';
import { parseLimitParam, parseOffsetParam } from '../utils/validation';
import { AffiliateReferralStatus } from '@prisma/client';

// Validation schemas
const enrollSchema = z.object({
  commissionRate: z.number().min(0).max(100).optional(),
});

const createLinkSchema = z.object({
  campaign: z.string().optional(),
  landingPage: z.string().min(1),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

const trackReferralSchema = z.object({
  affiliateCode: z.string().min(1),
  referredUserId: z.string().min(1),
  subscriptionId: z.string().optional(),
  commissionAmount: z.number().min(0),
});

const withdrawalSchema = z.object({
  amount: z.number().min(50),
  paymentMethod: z.enum(['PayPal', 'Stripe', 'Bank Transfer']),
  bankDetails: z.string().optional(),
});

/**
 * Enroll in affiliate program
 * POST /api/v1/affiliates/enroll
 */
export const enrollAffiliate = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = enrollSchema.parse(req.body);

    const program = await AffiliateService.enrollAffiliate({
      userId,
      ...data,
    });

    res.status(201).json({
      program,
      message: 'Successfully enrolled in affiliate program',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    if (error instanceof Error && error.message.includes('already enrolled')) {
      return res.status(409).json({
        error: 'Conflict',
        message: error.message,
      });
    }

    logger.error('Enroll affiliate error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to enroll in affiliate program',
    });
  }
};

/**
 * Get affiliate dashboard
 * GET /api/v1/affiliates/dashboard
 */
export const getAffiliateDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get affiliate program
    const program = await AffiliateService.getAffiliateProgram(userId);

    if (!program) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Affiliate program not found. Please enroll first.',
      });
    }

    // Get dashboard stats
    const stats = await AffiliateService.getDashboardStats(userId);

    res.json({
      program,
      stats,
    });
  } catch (error) {
    logger.error('Get affiliate dashboard error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch affiliate dashboard',
    });
  }
};

/**
 * Get affiliate referrals
 * GET /api/v1/affiliates/referrals
 */
export const getAffiliateReferrals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, limit, offset } = req.query;

    // Get affiliate program
    const program = await AffiliateService.getAffiliateProgram(userId);

    if (!program) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Affiliate program not found',
      });
    }

    const parsedLimit = parseLimitParam(limit as string | undefined);
    const parsedOffset = parseOffsetParam(offset as string | undefined);

    const result = await AffiliateService.getAffiliateReferrals(
      program.id,
      status as AffiliateReferralStatus | undefined,
      parsedLimit,
      parsedOffset
    );

    res.json(result);
  } catch (error) {
    logger.error('Get affiliate referrals error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch referrals',
    });
  }
};

/**
 * Request withdrawal
 * POST /api/v1/affiliates/withdraw
 */
export const requestWithdrawal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = withdrawalSchema.parse(req.body);

    // Get affiliate program
    const program = await AffiliateService.getAffiliateProgram(userId);

    if (!program) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Affiliate program not found',
      });
    }

    const withdrawal = await AffiliateService.requestWithdrawal({
      affiliateId: program.id,
      ...data,
    });

    res.status(201).json({
      withdrawal,
      message: 'Withdrawal request submitted successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    if (error instanceof Error && error.message.includes('Insufficient balance')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message,
      });
    }

    if (error instanceof Error && error.message.includes('Minimum withdrawal')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message,
      });
    }

    logger.error('Request withdrawal error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to request withdrawal',
    });
  }
};

/**
 * Get affiliate withdrawal history
 * GET /api/v1/affiliates/withdrawals
 */
export const getWithdrawals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit, offset } = req.query;

    // Get affiliate program
    const program = await AffiliateService.getAffiliateProgram(userId);

    if (!program) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Affiliate program not found',
      });
    }

    const parsedLimit = parseLimitParam(limit as string | undefined);
    const parsedOffset = parseOffsetParam(offset as string | undefined);

    const result = await AffiliateService.getAffiliateWithdrawals(
      program.id,
      parsedLimit,
      parsedOffset
    );

    res.json(result);
  } catch (error) {
    logger.error('Get withdrawals error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch withdrawals',
    });
  }
};

/**
 * Get affiliate links
 * GET /api/v1/affiliates/links
 */
export const getAffiliateLinks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit, offset } = req.query;

    // Get affiliate program
    const program = await AffiliateService.getAffiliateProgram(userId);

    if (!program) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Affiliate program not found',
      });
    }

    const parsedLimit = parseLimitParam(limit as string | undefined);
    const parsedOffset = parseOffsetParam(offset as string | undefined);

    const result = await AffiliateService.getAffiliateLinks(
      program.id,
      parsedLimit,
      parsedOffset
    );

    res.json(result);
  } catch (error) {
    logger.error('Get affiliate links error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch affiliate links',
    });
  }
};

/**
 * Create affiliate link
 * POST /api/v1/affiliates/links
 */
export const createAffiliateLink = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = createLinkSchema.parse(req.body);

    // Get affiliate program
    const program = await AffiliateService.getAffiliateProgram(userId);

    if (!program) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Affiliate program not found',
      });
    }

    const link = await AffiliateService.createLink({
      affiliateId: program.id,
      ...data,
    });

    // Build full URL with affiliate code
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const params = new URLSearchParams();
    params.append('ref', program.code);

    if (link.utmSource) params.append('utm_source', link.utmSource);
    if (link.utmMedium) params.append('utm_medium', link.utmMedium);
    if (link.utmCampaign) params.append('utm_campaign', link.utmCampaign);

    const fullUrl = `${baseUrl}${link.landingPage}?${params.toString()}`;

    res.status(201).json({
      link: {
        ...link,
        fullUrl,
      },
      message: 'Affiliate link created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    logger.error('Create affiliate link error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create affiliate link',
    });
  }
};

/**
 * Track referral click (public endpoint)
 * POST /api/v1/affiliates/track
 */
export const trackReferralClick = async (req: AuthRequest, res: Response) => {
  try {
    const { code, linkId } = req.body;

    if (!code && !linkId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Either code or linkId is required',
      });
    }

    // Verify affiliate code exists
    if (code) {
      const program = await AffiliateService.getAffiliateByCode(code);

      if (!program || !program.isActive) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Invalid affiliate code',
        });
      }
    }

    // Track link click if linkId provided
    if (linkId) {
      await AffiliateService.trackClick(linkId);
    }

    // Store affiliate code in session/cookie for later conversion tracking
    // This would typically be done in middleware

    res.json({
      message: 'Click tracked successfully',
    });
  } catch (error) {
    logger.error('Track referral click error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to track referral click',
    });
  }
};

/**
 * Track conversion (internal API)
 * POST /api/v1/affiliates/conversions
 */
export const trackConversion = async (req: AuthRequest, res: Response) => {
  try {
    const data = trackReferralSchema.parse(req.body);

    const referral = await AffiliateService.trackReferral(data);

    res.status(201).json({
      referral,
      message: 'Conversion tracked successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    if (error instanceof Error && error.message.includes('Invalid or inactive')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
    }

    if (error instanceof Error && error.message.includes('already been referred')) {
      return res.status(409).json({
        error: 'Conflict',
        message: error.message,
      });
    }

    logger.error('Track conversion error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to track conversion',
    });
  }
};

/**
 * Get affiliate program by code (public endpoint for referral page)
 * GET /api/v1/affiliates/code/:code
 */
export const getAffiliateByCode = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;

    const program = await AffiliateService.getAffiliateByCode(code);

    if (!program) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Affiliate program not found',
      });
    }

    res.json({ program });
  } catch (error) {
    logger.error('Get affiliate by code error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch affiliate program',
    });
  }
};

/**
 * Detect fraud (admin endpoint)
 * GET /api/v1/affiliates/:id/fraud-check
 */
export const detectFraud = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await AffiliateService.detectFraud(id);

    res.json(result);
  } catch (error) {
    logger.error('Detect fraud error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to perform fraud detection',
    });
  }
};

/**
 * Approve referral (admin endpoint)
 * POST /api/v1/affiliates/referrals/:id/approve
 */
export const approveReferral = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const referral = await AffiliateService.approveReferral(id);

    res.json({
      referral,
      message: 'Referral approved successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
    }

    if (error instanceof Error && error.message.includes('not pending')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message,
      });
    }

    logger.error('Approve referral error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to approve referral',
    });
  }
};

/**
 * Complete withdrawal (admin endpoint)
 * POST /api/v1/affiliates/withdrawals/:id/complete
 */
export const completeWithdrawal = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Transaction ID is required',
      });
    }

    const withdrawal = await AffiliateService.completeWithdrawal(id, transactionId);

    res.json({
      withdrawal,
      message: 'Withdrawal completed successfully',
    });
  } catch (error) {
    logger.error('Complete withdrawal error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to complete withdrawal',
    });
  }
};
