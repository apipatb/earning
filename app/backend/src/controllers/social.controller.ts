import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// User Profile & Social
export const getUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            earnings: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user stats
    const earnings = await prisma.earning.findMany({
      where: { userId },
    });

    const totalEarnings = earnings.reduce((sum, e) => sum + Number(e.amount), 0);
    const badges = await prisma.badge.findMany({
      where: { userId },
    });

    res.json({
      profile: user,
      stats: {
        totalEarnings: totalEarnings,
        totalEarningsCount: user._count.earnings,
        followerCount: user._count.followers,
        followingCount: user._count.following,
      },
      badges: badges.map((b) => b.badgeType),
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { name, bio, avatar, socialLinks } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        bio,
        avatar,
        socialLinks: socialLinks || {},
      },
      create: {
        userId,
        bio: bio || '',
        avatar: avatar || '',
        socialLinks: socialLinks || {},
      },
    });

    // Update user name
    await prisma.user.update({
      where: { id: userId },
      data: { name },
    });

    res.json({
      message: 'Profile updated',
      profile,
    });
  } catch (error) {
    next(error);
  }
};

// Following System
export const followUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { targetUserId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (userId === targetUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    const existing = await prisma.userFollowing.findFirst({
      where: {
        followerId: userId,
        followingId: targetUserId,
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    const follow = await prisma.userFollowing.create({
      data: {
        followerId: userId,
        followingId: targetUserId,
      },
    });

    res.status(201).json({
      message: 'Now following user',
      follow,
    });
  } catch (error) {
    next(error);
  }
};

export const unfollowUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { targetUserId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.userFollowing.deleteMany({
      where: {
        followerId: userId,
        followingId: targetUserId,
      },
    });

    res.json({ message: 'Unfollowed user' });
  } catch (error) {
    next(error);
  }
};

export const getFollowers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    const followers = await prisma.userFollowing.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(followers.map((f) => f.follower));
  } catch (error) {
    next(error);
  }
};

export const getFollowing = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    const following = await prisma.userFollowing.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(following.map((f) => f.following));
  } catch (error) {
    next(error);
  }
};

// Badges & Achievements
export const awardBadge = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId, badgeType, description } = req.body;

    const badge = await prisma.badge.create({
      data: {
        userId,
        badgeType,
        description: description || '',
        earnedAt: new Date(),
      },
    });

    res.status(201).json({
      message: 'Badge awarded',
      badge,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserBadges = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;

    const badges = await prisma.badge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
    });

    res.json(badges);
  } catch (error) {
    next(error);
  }
};

// Social Activity & Posts
export const createPost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { content, postType, attachments, isPublic } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const post = await prisma.socialPost.create({
      data: {
        userId,
        content,
        postType: postType || 'achievement',
        attachments: attachments || [],
        isPublic: isPublic !== false,
        likesCount: 0,
        sharesCount: 0,
      },
    });

    res.status(201).json({
      message: 'Post created',
      post,
    });
  } catch (error) {
    next(error);
  }
};

export const getFeedPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { limit = 20, offset = 0 } = req.query;

    // Get following list
    const following = await prisma.userFollowing.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);
    followingIds.push(userId || ''); // Include own posts

    const posts = await prisma.socialPost.findMany({
      where: {
        userId: { in: followingIds },
        isPublic: true,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
        comments: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit) || 20,
      skip: Number(offset) || 0,
    });

    res.json(posts);
  } catch (error) {
    next(error);
  }
};

export const likePost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const existing = await prisma.postLike.findFirst({
      where: { postId, userId },
    });

    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } });

      await prisma.socialPost.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      });

      return res.json({ message: 'Post unliked' });
    }

    await prisma.postLike.create({
      data: { postId, userId },
    });

    await prisma.socialPost.update({
      where: { id: postId },
      data: { likesCount: { increment: 1 } },
    });

    res.json({ message: 'Post liked' });
  } catch (error) {
    next(error);
  }
};

// Leaderboards
export const getGlobalLeaderboard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { period = 'month', limit = 100 } = req.query;

    let startDate: Date;
    const now = new Date();

    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    // Get earnings by user
    const earnings = await prisma.earning.findMany({
      where: {
        date: { gte: startDate },
      },
      select: {
        userId: true,
        amount: true,
      },
    });

    // Aggregate earnings per user
    const userEarnings = new Map<string, number>();
    earnings.forEach((e) => {
      userEarnings.set(e.userId, (userEarnings.get(e.userId) || 0) + Number(e.amount));
    });

    // Get user details
    const leaderboard = await Promise.all(
      Array.from(userEarnings.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, Number(limit) || 100)
        .map(async ([userId, total]) => {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true },
          });
          return { user, totalEarnings: total };
        })
    );

    res.json({
      period,
      leaderboard: leaderboard.map((entry, idx) => ({
        rank: idx + 1,
        ...entry,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getPlatformLeaderboard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { platformId } = req.params;
    const { limit = 50 } = req.query;

    const earnings = await prisma.earning.findMany({
      where: { platformId },
      select: { userId: true, amount: true },
    });

    const userEarnings = new Map<string, number>();
    earnings.forEach((e) => {
      userEarnings.set(e.userId, (userEarnings.get(e.userId) || 0) + Number(e.amount));
    });

    const leaderboard = await Promise.all(
      Array.from(userEarnings.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, Number(limit) || 50)
        .map(async ([userId, total]) => {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true },
          });
          return { user, totalEarnings: total };
        })
    );

    res.json({
      platformId,
      leaderboard: leaderboard.map((entry, idx) => ({
        rank: idx + 1,
        ...entry,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// Social Sharing
export const shareAchievement = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { achievementType, message, platforms } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const share = await prisma.achievementShare.create({
      data: {
        userId,
        achievementType,
        message: message || '',
        sharedOn: platforms || [],
        shareCount: platforms?.length || 0,
      },
    });

    res.status(201).json({
      message: 'Achievement shared',
      share,
    });
  } catch (error) {
    next(error);
  }
};

// Community Stats
export const getCommunityStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.earning.groupBy({
      by: ['userId'],
    });

    const totalEarnings = await prisma.earning.aggregate({
      _sum: { amount: true },
    });

    const totalPosts = await prisma.socialPost.count();
    const totalBadges = await prisma.badge.count();

    res.json({
      community: {
        totalUsers,
        activeUsers: activeUsers.length,
        totalPosts,
        totalBadges,
        totalEarnings: Number(totalEarnings._sum.amount) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
