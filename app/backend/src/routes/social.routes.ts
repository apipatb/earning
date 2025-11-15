import { Router } from 'express';
import {
  getUserProfile,
  updateProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  awardBadge,
  getUserBadges,
  createPost,
  getFeedPosts,
  likePost,
  getGlobalLeaderboard,
  getPlatformLeaderboard,
  shareAchievement,
  getCommunityStats,
} from '../controllers/social.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Public user profiles
router.get('/user/:userId', getUserProfile);
router.get('/user/:userId/badges', getUserBadges);
router.get('/user/:userId/followers', getFollowers);
router.get('/user/:userId/following', getFollowing);

// Profile management (authenticated)
router.put('/profile', auth, updateProfile);

// Following system
router.post('/follow/:targetUserId', auth, followUser);
router.delete('/follow/:targetUserId', auth, unfollowUser);

// Badges
router.post('/badges', auth, awardBadge);

// Social posts and feed
router.post('/posts', auth, createPost);
router.get('/feed', auth, getFeedPosts);
router.post('/posts/:postId/like', auth, likePost);

// Leaderboards (public)
router.get('/leaderboard/global', getGlobalLeaderboard);
router.get('/leaderboard/platform/:platformId', getPlatformLeaderboard);

// Sharing
router.post('/achievements/share', auth, shareAchievement);

// Community stats (public)
router.get('/stats', getCommunityStats);

export default router;
