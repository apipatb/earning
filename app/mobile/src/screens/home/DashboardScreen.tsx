import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import APIClient from '../../api/client';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboard();
    }, [])
  );

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await APIClient.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, []);

  if (loading && !dashboard) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
      }
    >
      {/* Header Stats */}
      <View style={styles.headerSection}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Today</Text>
          <Text style={styles.statValue}>
            ${dashboard?.todayEarnings?.toFixed(2) || '0.00'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>This Month</Text>
          <Text style={styles.statValue}>
            ${dashboard?.monthlyEarnings?.toFixed(2) || '0.00'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Average Daily</Text>
          <Text style={styles.statValue}>
            ${dashboard?.averageDaily?.toFixed(2) || '0.00'}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddEarning')}
        >
          <Ionicons name="add-circle" size={24} color="#3b82f6" />
          <Text style={styles.actionButtonText}>Add Earning</Text>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="eye" size={24} color="#3b82f6" />
          <Text style={styles.actionButtonText}>View Report</Text>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Top Platforms */}
      {dashboard?.topPlatforms && dashboard.topPlatforms.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Platforms</Text>
          {dashboard.topPlatforms.slice(0, 3).map((platform: any, idx: number) => (
            <View key={idx} style={styles.platformCard}>
              <View>
                <Text style={styles.platformName}>{platform.name}</Text>
                <Text style={styles.platformEarnings}>
                  ${platform.earnings?.toFixed(2) || '0.00'}
                </Text>
              </View>
              <Text style={styles.platformPercentage}>
                {platform.percentage?.toFixed(1) || '0'}%
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Streak Information */}
      {dashboard?.currentStreak !== undefined && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Streak</Text>
          <View style={styles.streakCard}>
            <Ionicons name="flame" size={40} color="#ff6b6b" />
            <View style={styles.streakContent}>
              <Text style={styles.streakDays}>{dashboard.currentStreak} days</Text>
              <Text style={styles.streakSubtext}>Keep it up!</Text>
            </View>
          </View>
        </View>
      )}

      {/* Recent Activity */}
      {dashboard?.recentEarnings && dashboard.recentEarnings.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Earnings')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {dashboard.recentEarnings.slice(0, 3).map((earning: any, idx: number) => (
            <View key={idx} style={styles.activityCard}>
              <View>
                <Text style={styles.activityPlatform}>{earning.platform}</Text>
                <Text style={styles.activityDate}>
                  {new Date(earning.date).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.activityAmount}>${earning.amount?.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Growth Chart Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="bar-chart" size={48} color="#3b82f6" />
          <Text style={styles.chartText}>
            {dashboard?.weeklyChange?.toFixed(1) || '0'}% vs last week
          </Text>
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 8,
  },
  statValue: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  viewAll: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionButtonText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  platformCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  platformName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  platformEarnings: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '700',
  },
  platformPercentage: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
  },
  streakCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  streakContent: {
    marginLeft: 16,
  },
  streakDays: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  streakSubtext: {
    color: '#9ca3af',
    fontSize: 14,
  },
  activityCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  activityPlatform: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityDate: {
    color: '#9ca3af',
    fontSize: 14,
  },
  activityAmount: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '700',
  },
  chartPlaceholder: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  chartText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
});
