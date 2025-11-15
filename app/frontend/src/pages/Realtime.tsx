import { useState, useEffect } from 'react';
import {
  Wifi,
  AlertCircle,
  Bell,
  Users,
  Activity,
  TrendingUp,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';
import { realtimeAPI } from '../lib/api';
import { notify } from '../store/notification.store';

interface RealtimeAlert {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  isAcknowledged: boolean;
  createdAt: string;
}

interface UserSession {
  id: string;
  deviceType: string;
  lastHeartbeat: string;
}

interface RealtimeStats {
  activeConnections: number;
  unreadAlerts: number;
  criticalAlerts: number;
  activeSubscriptions: number;
  totalEventsThisHour: number;
}

interface LiveEvent {
  id: string;
  eventType: string;
  data: string;
  createdAt: string;
}

interface NotificationDeliveryStats {
  totalSent: number;
  delivered: number;
  failed: number;
  byPlatform: Array<{
    platform: string;
    _count: number;
  }>;
}

export default function Realtime() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'sessions' | 'events' | 'delivery'>('alerts');
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [stats, setStats] = useState<RealtimeStats | null>(null);
  const [deliveryStats, setDeliveryStats] = useState<NotificationDeliveryStats | null>(null);
  const [userStatus, setUserStatus] = useState<'online' | 'idle' | 'away' | 'offline'>('online');

  useEffect(() => {
    loadData();
    // Simulate real-time updates every 5 seconds
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'alerts') {
        const data = await realtimeAPI.getRealtimeAlerts();
        setAlerts(data);
      } else if (activeTab === 'sessions') {
        const data = await realtimeAPI.getActiveSessions();
        setSessions(data);
      } else if (activeTab === 'events') {
        const data = await realtimeAPI.getLiveEvents();
        setEvents(data);
      } else if (activeTab === 'delivery') {
        const data = await realtimeAPI.getNotificationDeliveryStats();
        setDeliveryStats(data);
      }

      const statsData = await realtimeAPI.getRealtimeStats();
      setStats(statsData);
    } catch (error) {
      notify.error('Error', 'Failed to load realtime data');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAlertAsRead = async (alertId: string) => {
    try {
      await realtimeAPI.markAlertAsRead(alertId);
      setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, isRead: true } : a)));
    } catch (error) {
      notify.error('Error', 'Failed to mark alert as read');
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await realtimeAPI.acknowledgeAlert(alertId);
      setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, isAcknowledged: true } : a)));
      notify.success('Success', 'Alert acknowledged');
    } catch (error) {
      notify.error('Error', 'Failed to acknowledge alert');
    }
  };

  const handleSetPresence = async (status: typeof userStatus) => {
    try {
      await realtimeAPI.setUserPresence({ status, activity: 'working' });
      setUserStatus(status);
      notify.success('Success', `Status set to ${status}`);
    } catch (error) {
      notify.error('Error', 'Failed to set status');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'normal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Real-time Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Live updates, alerts, and presence tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSetPresence('online')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              userStatus === 'online'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <Wifi className="w-4 h-4 inline mr-2" />
            Online
          </button>
          <button
            onClick={() => handleSetPresence('away')}
            className={`px-3 py-2 rounded-lg transition-colors ${
              userStatus === 'away'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Away
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <Wifi className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeConnections}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active Connections</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400 mb-2" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.unreadAlerts}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Unread Alerts</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mb-2" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.criticalAlerts}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Critical Alerts</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400 mb-2" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeSubscriptions}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Subscriptions</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalEventsThisHour}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Events/Hour</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {['alerts', 'sessions', 'events', 'delivery'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab === 'alerts' && <span className="flex items-center gap-2"><Bell className="w-4 h-4" /> Alerts</span>}
            {tab === 'sessions' && <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Sessions</span>}
            {tab === 'events' && <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> Events</span>}
            {tab === 'delivery' && <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Delivery</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400 animate-pulse">Loading...</div>
        </div>
      ) : (
        <>
          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow text-center">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No alerts</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow flex items-start gap-4"
                  >
                    <div
                      className={`mt-1 p-2 rounded-lg flex-shrink-0 ${
                        alert.priority === 'critical' ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'
                      }`}
                    >
                      <AlertCircle className={`w-5 h-5 ${alert.priority === 'critical' ? 'text-red-600' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{alert.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getPriorityColor(alert.priority)}`}>
                          {alert.priority}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">{alert.message}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(alert.createdAt).toLocaleString()}
                        </p>
                        <div className="flex gap-2">
                          {!alert.isRead && (
                            <button
                              onClick={() => handleMarkAlertAsRead(alert.id)}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 transition-colors"
                            >
                              <Check className="w-3 h-3 inline mr-1" /> Read
                            </button>
                          )}
                          {!alert.isAcknowledged && (
                            <button
                              onClick={() => handleAcknowledgeAlert(alert.id)}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 transition-colors"
                            >
                              <Check className="w-3 h-3 inline mr-1" /> Acknowledge
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {sessions.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No active sessions</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Device</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Last Heartbeat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {sessions.map((session) => (
                        <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <Wifi className="w-4 h-4 inline mr-2 text-green-600" />
                            {session.deviceType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {new Date(session.lastHeartbeat).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="space-y-2">
              {events.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow text-center">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No live events</p>
                </div>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{event.eventType}</h3>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-4 font-mono text-sm text-gray-900 dark:text-gray-100 overflow-x-auto">
                      {event.data}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Delivery Stats Tab */}
          {activeTab === 'delivery' && deliveryStats && (
            <div className="space-y-6">
              {/* Delivery Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{deliveryStats.totalSent}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Sent</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{deliveryStats.delivered}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Delivered</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">{deliveryStats.failed}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Failed</p>
                </div>
              </div>

              {/* Platform Breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delivery by Platform</h3>
                <div className="space-y-2">
                  {deliveryStats.byPlatform.map((platform) => (
                    <div key={platform.platform} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-gray-900 dark:text-white capitalize font-medium">{platform.platform}</span>
                      <span className="text-gray-600 dark:text-gray-400">{platform._count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
