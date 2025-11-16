import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  AttachMoney,
  Warning,
  ShoppingCart,
  AccessTime,
  SupportAgent,
  CheckCircle,
  ThumbUp,
} from '@mui/icons-material';
import api from '../services/api';

interface SegmentAnalysis {
  totalMembers: number;
  avgLifetimeValue: number;
  totalLifetimeValue: number;
  avgChurnRisk: number;
  avgEngagementScore: number;
  avgPurchaseFrequency: number;
  avgRecency: number;
  avgTicketCount: number;
  conversionRate: number;
  retentionRate: number;
  lastCalculated: string;
}

interface SegmentAnalyticsProps {
  segmentId: string;
}

const SegmentAnalytics: React.FC<SegmentAnalyticsProps> = ({ segmentId }) => {
  const [analytics, setAnalytics] = useState<SegmentAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [segmentId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/segments/${segmentId}/analytics`);
      setAnalytics(response.data.analytics);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const getChurnRiskLevel = (risk: number): { level: string; color: 'success' | 'warning' | 'error' } => {
    if (risk >= 70) return { level: 'High', color: 'error' };
    if (risk >= 40) return { level: 'Medium', color: 'warning' };
    return { level: 'Low', color: 'success' };
  };

  const getEngagementLevel = (score: number): { level: string; color: 'success' | 'warning' | 'error' } => {
    if (score >= 70) return { level: 'High', color: 'success' };
    if (score >= 40) return { level: 'Medium', color: 'warning' };
    return { level: 'Low', color: 'error' };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (value: number, decimals = 1) => {
    return Number(value).toFixed(decimals);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Alert severity="info">
        No analytics data available for this segment.
      </Alert>
    );
  }

  const churnRiskInfo = getChurnRiskLevel(Number(analytics.avgChurnRisk));
  const engagementInfo = getEngagementLevel(Number(analytics.avgEngagementScore));

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last calculated: {new Date(analytics.lastCalculated).toLocaleString()}
      </Typography>

      <Grid container spacing={3}>
        {/* Total Members */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <People color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Total Members
                </Typography>
              </Box>
              <Typography variant="h4" component="div" fontWeight="bold">
                {analytics.totalMembers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Average Lifetime Value */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Avg Lifetime Value
                </Typography>
              </Box>
              <Typography variant="h4" component="div" fontWeight="bold">
                {formatCurrency(Number(analytics.avgLifetimeValue))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Lifetime Value */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Total LTV
                </Typography>
              </Box>
              <Typography variant="h4" component="div" fontWeight="bold">
                {formatCurrency(Number(analytics.totalLifetimeValue))}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Churn Risk */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Warning color={churnRiskInfo.color} sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Churn Risk
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h4" component="div" fontWeight="bold">
                  {formatNumber(Number(analytics.avgChurnRisk))}%
                </Typography>
                <Chip
                  label={churnRiskInfo.level}
                  color={churnRiskInfo.color}
                  size="small"
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={Number(analytics.avgChurnRisk)}
                color={churnRiskInfo.color}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Engagement Score */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ThumbUp color={engagementInfo.color} sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Engagement Score
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h4" component="div" fontWeight="bold">
                  {formatNumber(Number(analytics.avgEngagementScore))}%
                </Typography>
                <Chip
                  label={engagementInfo.level}
                  color={engagementInfo.color}
                  size="small"
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={Number(analytics.avgEngagementScore)}
                color={engagementInfo.color}
                sx={{ height: 8, borderRadius: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Purchase Frequency */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ShoppingCart color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Avg Purchases
                </Typography>
              </Box>
              <Typography variant="h4" component="div" fontWeight="bold">
                {formatNumber(Number(analytics.avgPurchaseFrequency), 1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                per customer
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Average Recency */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccessTime color="info" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Avg Recency
                </Typography>
              </Box>
              <Typography variant="h4" component="div" fontWeight="bold">
                {analytics.avgRecency}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                days since last purchase
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Support Tickets */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SupportAgent color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Avg Tickets
                </Typography>
              </Box>
              <Typography variant="h4" component="div" fontWeight="bold">
                {formatNumber(Number(analytics.avgTicketCount), 1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                per customer
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Conversion Rate */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Typography variant="h6" component="div">
                  Conversion Rate
                </Typography>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Typography variant="h4" component="div" fontWeight="bold">
                  {formatNumber(Number(analytics.conversionRate))}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Number(analytics.conversionRate)}
                color="success"
                sx={{ height: 8, borderRadius: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Retention Rate */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp
                  color={Number(analytics.retentionRate) >= 70 ? 'success' : 'warning'}
                  sx={{ mr: 1 }}
                />
                <Typography variant="h6" component="div">
                  Retention Rate
                </Typography>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Typography variant="h4" component="div" fontWeight="bold">
                  {formatNumber(Number(analytics.retentionRate))}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Number(analytics.retentionRate)}
                color={Number(analytics.retentionRate) >= 70 ? 'success' : 'warning'}
                sx={{ height: 8, borderRadius: 1 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Active in last 90 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Insights Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Segment Insights
        </Typography>
        <Grid container spacing={2}>
          {Number(analytics.avgChurnRisk) >= 70 && (
            <Grid item xs={12}>
              <Alert severity="error" icon={<Warning />}>
                <strong>High Churn Risk:</strong> This segment has a high churn risk of {formatNumber(Number(analytics.avgChurnRisk))}%.
                Consider targeted re-engagement campaigns or special offers.
              </Alert>
            </Grid>
          )}

          {Number(analytics.avgEngagementScore) < 40 && (
            <Grid item xs={12}>
              <Alert severity="warning">
                <strong>Low Engagement:</strong> Average engagement score is {formatNumber(Number(analytics.avgEngagementScore))}%.
                Focus on improving customer interaction and communication.
              </Alert>
            </Grid>
          )}

          {Number(analytics.avgLifetimeValue) >= 500 && (
            <Grid item xs={12}>
              <Alert severity="success">
                <strong>High Value Segment:</strong> Average lifetime value of {formatCurrency(Number(analytics.avgLifetimeValue))}
                indicates this is a valuable customer segment worth nurturing.
              </Alert>
            </Grid>
          )}

          {Number(analytics.retentionRate) >= 80 && (
            <Grid item xs={12}>
              <Alert severity="success">
                <strong>Excellent Retention:</strong> {formatNumber(Number(analytics.retentionRate))}% retention rate shows
                strong customer loyalty in this segment.
              </Alert>
            </Grid>
          )}

          {analytics.avgRecency > 90 && (
            <Grid item xs={12}>
              <Alert severity="warning">
                <strong>Inactive Customers:</strong> Average of {analytics.avgRecency} days since last purchase.
                Consider win-back campaigns to re-engage these customers.
              </Alert>
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
};

export default SegmentAnalytics;
