import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
}

interface LeaderboardEntry {
  rank: number;
  user: User;
  totalEarnings: number;
}

interface SocialPost {
  id: string;
  user: User;
  content: string;
  postType: string;
  likesCount: number;
  createdAt: string;
}

interface Badge {
  id: string;
  badgeType: string;
  description: string;
  earnedAt: string;
}

export default function Community() {
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [feed, setFeed] = useState<SocialPost[]>([]);
  const [communityStats, setCommunityStats] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userBadges, setUserBadges] = useState<Badge[]>([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab, period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'leaderboard') {
        const res = await axios.get('/api/v1/social/leaderboard/global', {
          params: { period, limit: 100 },
        });
        setLeaderboard(res.data.leaderboard);
      } else if (activeTab === 'feed') {
        const res = await axios.get('/api/v1/social/feed');
        setFeed(res.data);
      } else if (activeTab === 'stats') {
        const res = await axios.get('/api/v1/social/stats');
        setCommunityStats(res.data.community);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewUserProfile = async (userId: string) => {
    try {
      const [profileRes, badgesRes] = await Promise.all([
        axios.get(`/api/v1/social/user/${userId}`),
        axios.get(`/api/v1/social/user/${userId}/badges`),
      ]);
      setSelectedUser(profileRes.data);
      setUserBadges(badgesRes.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const likePost = async (postId: string) => {
    try {
      await axios.post(`/api/v1/social/posts/${postId}/like`);
      // Refresh feed
      fetchData();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  if (loading && !leaderboard.length && !feed.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Community</h1>
          <p className="text-gray-400">Connect with other earners and compete on leaderboards</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-700 flex gap-8">
          {[
            { id: 'leaderboard', label: '🏆 Leaderboard' },
            { id: 'feed', label: '📰 Feed' },
            { id: 'stats', label: '📊 Stats' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 border-b-2 font-medium transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            {/* Period Selector */}
            <div className="flex gap-4">
              {['week', 'month', 'year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {/* Leaderboard Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-700 border-b border-gray-600">
                      <th className="px-6 py-4 text-left text-gray-300 font-semibold">Rank</th>
                      <th className="px-6 py-4 text-left text-gray-300 font-semibold">User</th>
                      <th className="px-6 py-4 text-right text-gray-300 font-semibold">Earnings</th>
                      <th className="px-6 py-4 text-center text-gray-300 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, idx) => (
                      <tr
                        key={entry.user.id}
                        className="border-b border-gray-700 hover:bg-gray-700 transition"
                      >
                        <td className="px-6 py-4">
                          <span className={`text-lg font-bold ${
                            idx === 0
                              ? 'text-yellow-400'
                              : idx === 1
                              ? 'text-gray-400'
                              : idx === 2
                              ? 'text-orange-600'
                              : 'text-gray-300'
                          }`}>
                            {entry.rank}
                            {idx < 3 && (
                              <span className="ml-2">
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">{entry.user.name}</p>
                            <p className="text-gray-400 text-sm">{entry.user.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-green-400 font-bold">
                            ${entry.totalEarnings.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => viewUserProfile(entry.user.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Feed Tab */}
        {activeTab === 'feed' && (
          <div className="space-y-6">
            {feed.length > 0 ? (
              feed.map((post) => (
                <div key={post.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-white font-semibold">{post.user.name}</h3>
                      <p className="text-gray-400 text-sm">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-900 text-blue-300 rounded-full text-xs font-medium">
                      {post.postType}
                    </span>
                  </div>

                  <p className="text-gray-300 mb-4">{post.content}</p>

                  <div className="flex gap-4">
                    <button
                      onClick={() => likePost(post.id)}
                      className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition"
                    >
                      <span>❤️</span>
                      <span>{post.likesCount}</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition">
                      <span>💬</span>
                      <span>Comment</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-400 hover:text-green-400 transition">
                      <span>🔗</span>
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-12">No posts yet</div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && communityStats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">Total Users</div>
                <div className="text-3xl font-bold text-blue-400">{communityStats.totalUsers}</div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">Active Users</div>
                <div className="text-3xl font-bold text-green-400">{communityStats.activeUsers}</div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">Community Posts</div>
                <div className="text-3xl font-bold text-purple-400">{communityStats.totalPosts}</div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">Badges Earned</div>
                <div className="text-3xl font-bold text-orange-400">{communityStats.totalBadges}</div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">Total Community Earnings</div>
              <div className="text-4xl font-bold text-green-400">
                ${communityStats.totalEarnings.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* User Profile Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full border border-gray-700">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white">{selectedUser.profile.name}</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white">{selectedUser.profile.email}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">Total Earnings</p>
                  <p className="text-green-400 font-bold text-lg">
                    ${selectedUser.stats.totalEarnings.toFixed(2)}
                  </p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">Followers</p>
                  <p className="text-blue-400 font-bold">{selectedUser.stats.followerCount}</p>
                </div>
              </div>

              {/* Badges */}
              {userBadges.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm mb-3">Badges</p>
                  <div className="flex flex-wrap gap-2">
                    {userBadges.map((badge) => (
                      <div
                        key={badge.id}
                        className="bg-yellow-900 text-yellow-300 px-3 py-1 rounded-full text-xs"
                      >
                        🏆 {badge.badgeType}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-2">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                  Follow
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
