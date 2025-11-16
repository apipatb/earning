import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../services/api.service';
import { DashboardMetrics } from '../../types';
import { Colors } from '../../constants/colors';

export default function DashboardScreen() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await ApiService.getDashboardMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      // Fallback to mock data for demo
      setMetrics({
        totalTickets: 0,
        openTickets: 0,
        resolvedTickets: 0,
        avgResponseTime: 0,
        customerSatisfaction: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMetrics();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Here's your overview</Text>
      </View>

      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, styles.metricCardPrimary]}>
          <Ionicons name="ticket" size={32} color={Colors.primary} />
          <Text style={styles.metricValue}>{metrics?.totalTickets || 0}</Text>
          <Text style={styles.metricLabel}>Total Tickets</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardWarning]}>
          <Ionicons name="alert-circle" size={32} color={Colors.warning} />
          <Text style={styles.metricValue}>{metrics?.openTickets || 0}</Text>
          <Text style={styles.metricLabel}>Open Tickets</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardSuccess]}>
          <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
          <Text style={styles.metricValue}>{metrics?.resolvedTickets || 0}</Text>
          <Text style={styles.metricLabel}>Resolved</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardInfo]}>
          <Ionicons name="time" size={32} color={Colors.info} />
          <Text style={styles.metricValue}>{metrics?.avgResponseTime || 0}m</Text>
          <Text style={styles.metricLabel}>Avg Response</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <View style={styles.actionButton}>
            <Ionicons name="add-circle" size={24} color={Colors.primary} />
            <Text style={styles.actionButtonText}>New Ticket</Text>
          </View>
          <View style={styles.actionButton}>
            <Ionicons name="chatbubbles" size={24} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Live Chat</Text>
          </View>
          <View style={styles.actionButton}>
            <Ionicons name="analytics" size={24} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Analytics</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Satisfaction</Text>
        <View style={styles.satisfactionCard}>
          <View style={styles.satisfactionScore}>
            <Text style={styles.satisfactionValue}>
              {metrics?.customerSatisfaction || 0}%
            </Text>
            <Ionicons name="happy" size={48} color={Colors.success} />
          </View>
          <Text style={styles.satisfactionLabel}>Overall Rating</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.card,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    alignItems: 'center',
  },
  metricCardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  metricCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  metricCardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  metricCardInfo: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  satisfactionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  satisfactionScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  satisfactionValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.success,
  },
  satisfactionLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
  },
});
