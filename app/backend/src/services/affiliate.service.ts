import crypto from 'crypto';
import { AffiliateReferralStatus, AffiliateWithdrawalStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

interface TieredRate {
  minReferrals: number;
  maxReferrals: number | null;
  rate: number;
}

interface CreateAffiliateProgramData {
  userId: string;
  commissionRate?: number;
}

interface CreateLinkData {
  affiliateId: string;
  campaign?: string;
  landingPage: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

interface TrackReferralData {
  affiliateCode: string;
  referredUserId: string;
  subscriptionId?: string;
  commissionAmount: number;
}

interface WithdrawalRequestData {
  affiliateId: string;
  amount: number;
  paymentMethod: string;
  bankDetails?: string;
}

export class AffiliateService {
  /**
   * Generate a unique affiliate code
   */
  private static async generateUniqueCode(): Promise<string> {
    let code: string;
    let isUnique = false;

    while (!isUnique) {
      // Generate a random 8-character alphanumeric code
      code = crypto.randomBytes(4).toString('hex').toUpperCase();

      // Check if code already exists
      const existing = await prisma.affiliateProgram.findUnique({
        where: { code },
      });

      if (!existing) {
        isUnique = true;
        return code;
      }
    }

    throw new Error('Failed to generate unique affiliate code');
  }

  /**
   * Enroll user in affiliate program
   */
  static async enrollAffiliate(data: CreateAffiliateProgramData): Promise<any> {
    const { userId, commissionRate = 10 } = data;

    // Check if user already has an affiliate program
    const existing = await prisma.affiliateProgram.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new Error('User is already enrolled in the affiliate program');
    }

    // Generate unique affiliate code
    const code = await this.generateUniqueCode();

    // Create affiliate program
    const program = await prisma.affiliateProgram.create({
      data: {
        userId,
        code,
        commissionRate,
        isActive: true,
      },
    });

    return {
      id: program.id,
      code: program.code,
      commissionRate: Number(program.commissionRate),
      totalReferred: program.totalReferred,
      totalEarnings: Number(program.totalEarnings),
      tier: program.tier,
      isActive: program.isActive,
      createdAt: program.createdAt,
    };
  }

  /**
   * Get affiliate program by user ID
   */
  static async getAffiliateProgram(userId: string): Promise<any> {
    const program = await prisma.affiliateProgram.findUnique({
      where: { userId },
      include: {
        _count: {
          select: {
            referrals: true,
            links: true,
            withdrawals: true,
          },
        },
      },
    });

    if (!program) {
      return null;
    }

    return {
      id: program.id,
      code: program.code,
      commissionRate: Number(program.commissionRate),
      totalReferred: program.totalReferred,
      totalEarnings: Number(program.totalEarnings),
      tier: program.tier,
      isActive: program.isActive,
      createdAt: program.createdAt,
      stats: {
        totalReferrals: program._count.referrals,
        totalLinks: program._count.links,
        totalWithdrawals: program._count.withdrawals,
      },
    };
  }

  /**
   * Get affiliate program by code
   */
  static async getAffiliateByCode(code: string): Promise<any> {
    const program = await prisma.affiliateProgram.findUnique({
      where: { code },
    });

    if (!program) {
      return null;
    }

    return {
      id: program.id,
      code: program.code,
      isActive: program.isActive,
    };
  }

  /**
   * Calculate commission based on tier
   */
  private static calculateCommission(
    program: any,
    baseAmount: number
  ): number {
    let rate = Number(program.commissionRate);

    // Check for custom tiered rates
    if (program.customRates) {
      try {
        const tieredRates: TieredRate[] = JSON.parse(program.customRates);
        const totalReferrals = program.totalReferred;

        // Find applicable tier
        for (const tier of tieredRates) {
          if (
            totalReferrals >= tier.minReferrals &&
            (tier.maxReferrals === null || totalReferrals <= tier.maxReferrals)
          ) {
            rate = tier.rate;
            break;
          }
        }
      } catch (error) {
        logger.error('Error parsing custom commission rates:', error instanceof Error ? error : new Error(String(error)));
      }
    }

    return (baseAmount * rate) / 100;
  }

  /**
   * Track a referral
   */
  static async trackReferral(data: TrackReferralData): Promise<any> {
    const { affiliateCode, referredUserId, subscriptionId, commissionAmount } = data;

    // Get affiliate program
    const program = await prisma.affiliateProgram.findUnique({
      where: { code: affiliateCode },
    });

    if (!program || !program.isActive) {
      throw new Error('Invalid or inactive affiliate program');
    }

    // Check if user was already referred
    const existingReferral = await prisma.affiliateReferral.findFirst({
      where: {
        affiliateId: program.id,
        referredUserId,
      },
    });

    if (existingReferral) {
      throw new Error('User has already been referred');
    }

    // Calculate commission
    const commission = this.calculateCommission(program, commissionAmount);

    // Create referral
    const referral = await prisma.affiliateReferral.create({
      data: {
        affiliateId: program.id,
        referredUserId,
        status: 'PENDING',
        commission,
        subscriptionId,
        metadata: JSON.stringify({
          baseAmount: commissionAmount,
          commissionRate: Number(program.commissionRate),
          tier: program.tier,
        }),
      },
    });

    // Update affiliate program stats
    await prisma.affiliateProgram.update({
      where: { id: program.id },
      data: {
        totalReferred: { increment: 1 },
      },
    });

    return {
      id: referral.id,
      affiliateId: referral.affiliateId,
      referredUserId: referral.referredUserId,
      status: referral.status,
      commission: Number(referral.commission),
      createdAt: referral.createdAt,
    };
  }

  /**
   * Approve a referral
   */
  static async approveReferral(referralId: string): Promise<any> {
    const referral = await prisma.affiliateReferral.findUnique({
      where: { id: referralId },
      include: { affiliate: true },
    });

    if (!referral) {
      throw new Error('Referral not found');
    }

    if (referral.status !== 'PENDING') {
      throw new Error('Referral is not pending');
    }

    // Update referral status
    const updated = await prisma.affiliateReferral.update({
      where: { id: referralId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });

    // Update affiliate earnings
    await prisma.affiliateProgram.update({
      where: { id: referral.affiliateId },
      data: {
        totalEarnings: { increment: referral.commission },
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      commission: Number(updated.commission),
      approvedAt: updated.approvedAt,
    };
  }

  /**
   * Get referrals for an affiliate
   */
  static async getAffiliateReferrals(
    affiliateId: string,
    status?: AffiliateReferralStatus,
    limit = 50,
    offset = 0
  ): Promise<any> {
    const where: any = { affiliateId };
    if (status) {
      where.status = status;
    }

    const [referrals, total] = await Promise.all([
      prisma.affiliateReferral.findMany({
        where,
        include: {
          referredUser: {
            select: {
              id: true,
              email: true,
              name: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.affiliateReferral.count({ where }),
    ]);

    return {
      referrals: referrals.map((r) => ({
        id: r.id,
        status: r.status,
        commission: Number(r.commission),
        referredUser: r.referredUser,
        subscriptionId: r.subscriptionId,
        createdAt: r.createdAt,
        approvedAt: r.approvedAt,
        paidAt: r.paidAt,
      })),
      total,
      hasMore: total > offset + limit,
    };
  }

  /**
   * Create affiliate link
   */
  static async createLink(data: CreateLinkData): Promise<any> {
    const link = await prisma.affiliateLink.create({
      data: {
        affiliateId: data.affiliateId,
        campaign: data.campaign,
        landingPage: data.landingPage,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
      },
    });

    return {
      id: link.id,
      affiliateId: link.affiliateId,
      campaign: link.campaign,
      landingPage: link.landingPage,
      utmSource: link.utmSource,
      utmMedium: link.utmMedium,
      utmCampaign: link.utmCampaign,
      clicks: link.clicks,
      conversions: link.conversions,
      createdAt: link.createdAt,
    };
  }

  /**
   * Track link click
   */
  static async trackClick(linkId: string): Promise<void> {
    await prisma.affiliateLink.update({
      where: { id: linkId },
      data: {
        clicks: { increment: 1 },
      },
    });
  }

  /**
   * Track link conversion
   */
  static async trackConversion(linkId: string): Promise<void> {
    await prisma.affiliateLink.update({
      where: { id: linkId },
      data: {
        conversions: { increment: 1 },
      },
    });
  }

  /**
   * Get affiliate links
   */
  static async getAffiliateLinks(
    affiliateId: string,
    limit = 50,
    offset = 0
  ): Promise<any> {
    const [links, total] = await Promise.all([
      prisma.affiliateLink.findMany({
        where: { affiliateId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.affiliateLink.count({ where: { affiliateId } }),
    ]);

    return {
      links: links.map((link) => ({
        id: link.id,
        campaign: link.campaign,
        landingPage: link.landingPage,
        utmSource: link.utmSource,
        utmMedium: link.utmMedium,
        utmCampaign: link.utmCampaign,
        clicks: link.clicks,
        conversions: link.conversions,
        conversionRate: link.clicks > 0 ? (link.conversions / link.clicks) * 100 : 0,
        createdAt: link.createdAt,
      })),
      total,
      hasMore: total > offset + limit,
    };
  }

  /**
   * Request withdrawal
   */
  static async requestWithdrawal(data: WithdrawalRequestData): Promise<any> {
    const { affiliateId, amount, paymentMethod, bankDetails } = data;

    // Get affiliate program
    const program = await prisma.affiliateProgram.findUnique({
      where: { id: affiliateId },
    });

    if (!program) {
      throw new Error('Affiliate program not found');
    }

    // Check if affiliate has enough earnings
    const availableBalance = Number(program.totalEarnings);

    // Calculate total pending withdrawals
    const pendingWithdrawals = await prisma.affiliateWithdrawal.aggregate({
      where: {
        affiliateId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
      _sum: {
        amount: true,
      },
    });

    const pendingAmount = Number(pendingWithdrawals._sum.amount || 0);
    const availableForWithdrawal = availableBalance - pendingAmount;

    if (amount > availableForWithdrawal) {
      throw new Error(`Insufficient balance. Available: $${availableForWithdrawal.toFixed(2)}`);
    }

    // Minimum withdrawal amount
    if (amount < 50) {
      throw new Error('Minimum withdrawal amount is $50');
    }

    // Create withdrawal request
    const withdrawal = await prisma.affiliateWithdrawal.create({
      data: {
        affiliateId,
        amount,
        status: 'PENDING',
        paymentMethod,
        bankDetails: bankDetails ? this.encryptBankDetails(bankDetails) : null,
      },
    });

    return {
      id: withdrawal.id,
      amount: Number(withdrawal.amount),
      status: withdrawal.status,
      paymentMethod: withdrawal.paymentMethod,
      requestedAt: withdrawal.requestedAt,
    };
  }

  /**
   * Get withdrawals for an affiliate
   */
  static async getAffiliateWithdrawals(
    affiliateId: string,
    limit = 50,
    offset = 0
  ): Promise<any> {
    const [withdrawals, total] = await Promise.all([
      prisma.affiliateWithdrawal.findMany({
        where: { affiliateId },
        orderBy: { requestedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.affiliateWithdrawal.count({ where: { affiliateId } }),
    ]);

    return {
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        status: w.status,
        paymentMethod: w.paymentMethod,
        transactionId: w.transactionId,
        requestedAt: w.requestedAt,
        completedAt: w.completedAt,
      })),
      total,
      hasMore: total > offset + limit,
    };
  }

  /**
   * Complete withdrawal (admin function)
   */
  static async completeWithdrawal(
    withdrawalId: string,
    transactionId: string
  ): Promise<any> {
    const withdrawal = await prisma.affiliateWithdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'COMPLETED',
        transactionId,
        completedAt: new Date(),
      },
    });

    // Mark referrals as paid
    await prisma.affiliateReferral.updateMany({
      where: {
        affiliateId: withdrawal.affiliateId,
        status: 'APPROVED',
        paidAt: null,
      },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    return {
      id: withdrawal.id,
      status: withdrawal.status,
      transactionId: withdrawal.transactionId,
      completedAt: withdrawal.completedAt,
    };
  }

  /**
   * Get affiliate dashboard stats
   */
  static async getDashboardStats(userId: string): Promise<any> {
    const program = await prisma.affiliateProgram.findUnique({
      where: { userId },
    });

    if (!program) {
      throw new Error('Affiliate program not found');
    }

    const [referralStats, withdrawalStats, topLinks] = await Promise.all([
      // Referral stats by status
      prisma.affiliateReferral.groupBy({
        by: ['status'],
        where: { affiliateId: program.id },
        _count: true,
        _sum: {
          commission: true,
        },
      }),

      // Withdrawal stats
      prisma.affiliateWithdrawal.aggregate({
        where: {
          affiliateId: program.id,
          status: 'COMPLETED',
        },
        _sum: {
          amount: true,
        },
        _count: true,
      }),

      // Top performing links
      prisma.affiliateLink.findMany({
        where: { affiliateId: program.id },
        orderBy: { conversions: 'desc' },
        take: 5,
      }),
    ]);

    // Calculate pending withdrawals
    const pendingWithdrawals = await prisma.affiliateWithdrawal.aggregate({
      where: {
        affiliateId: program.id,
        status: { in: ['PENDING', 'APPROVED'] },
      },
      _sum: {
        amount: true,
      },
    });

    const totalEarnings = Number(program.totalEarnings);
    const totalWithdrawn = Number(withdrawalStats._sum.amount || 0);
    const pendingAmount = Number(pendingWithdrawals._sum.amount || 0);
    const availableBalance = totalEarnings - pendingAmount;

    return {
      overview: {
        totalEarnings,
        availableBalance,
        totalWithdrawn,
        pendingWithdrawals: pendingAmount,
        totalReferred: program.totalReferred,
        commissionRate: Number(program.commissionRate),
        tier: program.tier,
      },
      referrals: {
        pending: referralStats.find((s) => s.status === 'PENDING')?._count || 0,
        approved: referralStats.find((s) => s.status === 'APPROVED')?._count || 0,
        rejected: referralStats.find((s) => s.status === 'REJECTED')?._count || 0,
        paid: referralStats.find((s) => s.status === 'PAID')?._count || 0,
      },
      topLinks: topLinks.map((link) => ({
        id: link.id,
        campaign: link.campaign,
        clicks: link.clicks,
        conversions: link.conversions,
        conversionRate: link.clicks > 0 ? (link.conversions / link.clicks) * 100 : 0,
      })),
    };
  }

  /**
   * Fraud detection - check for suspicious referrals
   */
  static async detectFraud(affiliateId: string): Promise<any> {
    const suspiciousPatterns: string[] = [];

    // Check for multiple referrals from same IP (would need to store IP in metadata)
    // Check for referrals created too quickly
    const recentReferrals = await prisma.affiliateReferral.findMany({
      where: {
        affiliateId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (recentReferrals.length > 50) {
      suspiciousPatterns.push('Too many referrals in 24 hours');
    }

    // Check for self-referral
    const program = await prisma.affiliateProgram.findUnique({
      where: { id: affiliateId },
    });

    if (program) {
      const selfReferral = await prisma.affiliateReferral.findFirst({
        where: {
          affiliateId,
          referredUserId: program.userId,
        },
      });

      if (selfReferral) {
        suspiciousPatterns.push('Self-referral detected');
      }
    }

    return {
      isSuspicious: suspiciousPatterns.length > 0,
      patterns: suspiciousPatterns,
    };
  }

  /**
   * Encrypt bank details (placeholder - implement with proper encryption)
   */
  private static encryptBankDetails(bankDetails: string): string {
    // TODO: Implement proper encryption using crypto library
    return Buffer.from(bankDetails).toString('base64');
  }

  /**
   * Decrypt bank details (placeholder - implement with proper decryption)
   */
  private static decryptBankDetails(encryptedDetails: string): string {
    // TODO: Implement proper decryption using crypto library
    return Buffer.from(encryptedDetails, 'base64').toString('utf-8');
  }
}
