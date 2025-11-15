import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const COMMISSION_RATES = {
  free_to_pro: 0.20, // 20% for converting free to pro
  free_to_business: 0.30, // 30% for converting free to business
  pro_to_business: 0.25, // 25% for upgrading pro to business
  monthly_recurring: 0.10, // 10% of monthly subscription
};

// Get or create referral link
export const getReferralLink = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let affiliate = await prisma.affiliateProfile.findUnique({
      where: { userId },
    });

    if (!affiliate) {
      // Generate unique referral code
      const referralCode = `REF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      affiliate = await prisma.affiliateProfile.create({
        data: {
          userId,
          referralCode,
          referralLink: `https://earntrack.com?ref=${referralCode}`,
        },
      });
    }

    const stats = await prisma.affiliateConversion.aggregate({
      where: { affiliateId: affiliate.id },
      _count: true,
      _sum: { commissionEarned: true },
    });

    res.json({
      ...affiliate,
      totalConversions: stats._count || 0,
      totalEarnings: stats._sum.commissionEarned || 0,
    });
  } catch (error) {
    next(error);
  }
};

// Track referral signup
export const trackReferralSignup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { referralCode, newUserId } = req.body;

    if (!referralCode || !newUserId) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { referralCode },
    });

    if (!affiliate) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    // Record click
    await prisma.affiliateClick.create({
      data: {
        affiliateId: affiliate.id,
        sourceType: 'signup',
      },
    });

    res.json({ message: 'Signup tracked' });
  } catch (error) {
    next(error);
  }
};

// Track conversion (upgrade to paid)
export const trackConversion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { referralCode, userId, newTier, paymentAmount } = req.body;

    if (!referralCode || !userId || !newTier) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { referralCode },
    });

    if (!affiliate) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    // Calculate commission
    let commissionRate = 0;
    if (newTier === 'pro') {
      commissionRate = COMMISSION_RATES.free_to_pro;
    } else if (newTier === 'business') {
      commissionRate = COMMISSION_RATES.free_to_business;
    }

    const commissionEarned = paymentAmount * commissionRate;

    // Record conversion
    const conversion = await prisma.affiliateConversion.create({
      data: {
        affiliateId: affiliate.id,
        referredUserId: userId,
        tierUpgradedTo: newTier,
        commissionRate: commissionRate,
        commissionEarned: commissionEarned,
      },
    });

    // Update affiliate earnings
    await prisma.affiliateProfile.update({
      where: { id: affiliate.id },
      data: {
        totalEarningsGenerated: {
          increment: commissionEarned,
        },
      },
    });

    res.json({
      message: 'Conversion tracked',
      conversion,
      commissionEarned,
    });
  } catch (error) {
    next(error);
  }
};

// Get affiliate dashboard
export const getAffiliateStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { userId },
      include: {
        conversions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        clicks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate profile not found' });
    }

    // Calculate stats
    const totalClicks = await prisma.affiliateClick.count({
      where: { affiliateId: affiliate.id },
    });

    const totalConversions = await prisma.affiliateConversion.count({
      where: { affiliateId: affiliate.id },
    });

    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    const stats = {
      referralCode: affiliate.referralCode,
      referralLink: affiliate.referralLink,
      totalClicks,
      totalConversions,
      conversionRate: conversionRate.toFixed(2),
      totalEarnings: affiliate.totalEarningsGenerated || 0,
      recentConversions: affiliate.conversions,
      recentClicks: affiliate.clicks,
      tier: affiliate.tier,
      status: affiliate.status,
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// Get affiliate leaderboard
export const getAffiliateLeaderboard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const topAffiliates = await prisma.affiliateProfile.findMany({
      where: { status: 'active' },
      orderBy: { totalEarningsGenerated: 'desc' },
      take: 20,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    const leaderboard = topAffiliates.map((affiliate) => ({
      name: affiliate.user?.name || 'Anonymous',
      earnings: affiliate.totalEarningsGenerated || 0,
      referralCode: affiliate.referralCode,
      tier: affiliate.tier,
    }));

    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
};

// Get payout status
export const getPayoutStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { userId },
      include: {
        payouts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate profile not found' });
    }

    const pendingAmount = Math.max(0, (affiliate.totalEarningsGenerated || 0) - (affiliate.totalPaid || 0));
    const minimumPayout = 50; // $50 minimum
    const isEligibleForPayout = pendingAmount >= minimumPayout;

    res.json({
      totalEarned: affiliate.totalEarningsGenerated || 0,
      totalPaid: affiliate.totalPaid || 0,
      pendingAmount,
      isEligibleForPayout,
      minimumPayout,
      recentPayouts: affiliate.payouts,
      payoutMethod: affiliate.payoutMethod || 'stripe',
    });
  } catch (error) {
    next(error);
  }
};

// Request payout
export const requestPayout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { amount, payoutMethod } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { userId },
    });

    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate profile not found' });
    }

    const pendingAmount = (affiliate.totalEarningsGenerated || 0) - (affiliate.totalPaid || 0);
    const minimumPayout = 50;

    if (pendingAmount < minimumPayout) {
      return res.status(400).json({
        error: 'Minimum payout amount not reached',
        required: minimumPayout,
        current: pendingAmount,
      });
    }

    if (amount > pendingAmount) {
      return res.status(400).json({
        error: 'Payout amount exceeds available balance',
        available: pendingAmount,
        requested: amount,
      });
    }

    const payout = await prisma.affiliatePayout.create({
      data: {
        affiliateId: affiliate.id,
        amount,
        payoutMethod: payoutMethod || 'stripe',
        status: 'pending',
      },
    });

    res.json({
      message: 'Payout request submitted',
      payout,
      estimatedTime: '3-5 business days',
    });
  } catch (error) {
    next(error);
  }
};

// Get affiliate resources
export const getAffiliateResources = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const resources = {
      banners: [
        {
          id: 1,
          title: 'Small Banner',
          size: '300x250',
          preview: '/affiliate/banners/300x250.png',
        },
        {
          id: 2,
          title: 'Large Banner',
          size: '728x90',
          preview: '/affiliate/banners/728x90.png',
        },
        {
          id: 3,
          title: 'Skyscraper',
          size: '120x600',
          preview: '/affiliate/banners/120x600.png',
        },
      ],
      emailTemplates: [
        {
          id: 1,
          subject: 'How to earn $500+ per month with EarnTrack',
          preview: 'Join 10,000+ users tracking their earnings...',
        },
        {
          id: 2,
          subject: 'Free tool for freelancers & gig workers',
          preview: 'Stop using spreadsheets. Start earning more...',
        },
      ],
      socialPosts: [
        {
          id: 1,
          platform: 'twitter',
          text: 'Just hit $5K/month with EarnTrack 📈 Track all your gig income in one place. Free to start! https://earntrack.com',
        },
        {
          id: 2,
          platform: 'linkedin',
          text: 'Been using EarnTrack for 3 months. Game-changer for tracking multiple income streams...',
        },
      ],
      commissionRates: COMMISSION_RATES,
    };

    res.json(resources);
  } catch (error) {
    next(error);
  }
};
