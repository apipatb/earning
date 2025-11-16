import React from 'react';
import { Box, Typography, Grid, LinearProgress, Paper } from '@mui/material';
import {
  TrendingUp,
  ShowChart,
  AccountBalance,
  Assessment,
  CompareArrows,
} from '@mui/icons-material';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface FinancialMetricsData {
  profitMargin: number;
  roi: number;
  cashFlow: number;
  debtRatio: number;
  assetTurnover: number;
}

interface Props {
  data: FinancialMetricsData | null;
}

const FinancialMetrics: React.FC<Props> = ({ data }) => {
  if (!data) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No data available
        </Typography>
      </Box>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Get color based on metric performance
  const getMetricColor = (
    value: number,
    type: 'profit' | 'roi' | 'debt' | 'turnover'
  ) => {
    switch (type) {
      case 'profit':
      case 'roi':
      case 'turnover':
        return value >= 20
          ? 'success'
          : value >= 10
          ? 'warning'
          : 'error';
      case 'debt':
        return value <= 30
          ? 'success'
          : value <= 60
          ? 'warning'
          : 'error';
      default:
        return 'primary';
    }
  };

  // Get progress value (0-100) for visualization
  const getProgressValue = (value: number, max: number = 100) => {
    return Math.min((Math.abs(value) / max) * 100, 100);
  };

  // Prepare data for radar chart
  const radarData = [
    {
      metric: 'Profit Margin',
      value: Math.abs(data.profitMargin),
      fullMark: 50,
    },
    {
      metric: 'ROI',
      value: Math.abs(data.roi),
      fullMark: 50,
    },
    {
      metric: 'Asset Turnover',
      value: data.assetTurnover * 10, // Scale for visibility
      fullMark: 50,
    },
    {
      metric: 'Debt Ratio',
      value: 100 - Math.abs(data.debtRatio), // Inverse (lower is better)
      fullMark: 100,
    },
  ];

  return (
    <Box>
      {/* Key Metrics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp color={getMetricColor(data.profitMargin, 'profit')} />
              <Typography variant="body2" fontWeight="medium">
                Profit Margin
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight="bold">
              {formatPercentage(data.profitMargin)}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={getProgressValue(data.profitMargin)}
              color={getMetricColor(data.profitMargin, 'profit')}
            />
            <Typography variant="caption" color="text.secondary">
              {data.profitMargin >= 20
                ? 'Excellent performance'
                : data.profitMargin >= 10
                ? 'Good performance'
                : 'Needs improvement'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShowChart color={getMetricColor(data.roi, 'roi')} />
              <Typography variant="body2" fontWeight="medium">
                Return on Investment (ROI)
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight="bold">
              {formatPercentage(data.roi)}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={getProgressValue(data.roi)}
              color={getMetricColor(data.roi, 'roi')}
            />
            <Typography variant="caption" color="text.secondary">
              {data.roi >= 20
                ? 'Strong returns'
                : data.roi >= 10
                ? 'Moderate returns'
                : 'Low returns'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalance color="primary" />
              <Typography variant="body2" fontWeight="medium">
                Cash Flow
              </Typography>
            </Box>
            <Typography
              variant="h5"
              fontWeight="bold"
              color={data.cashFlow >= 0 ? 'success.main' : 'error.main'}
            >
              {formatCurrency(data.cashFlow)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {data.cashFlow >= 0
                ? 'Positive cash flow'
                : 'Negative cash flow'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment color={getMetricColor(data.debtRatio, 'debt')} />
              <Typography variant="body2" fontWeight="medium">
                Debt Ratio
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight="bold">
              {formatPercentage(data.debtRatio)}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={getProgressValue(data.debtRatio)}
              color={getMetricColor(data.debtRatio, 'debt')}
            />
            <Typography variant="caption" color="text.secondary">
              {data.debtRatio <= 30
                ? 'Low debt level'
                : data.debtRatio <= 60
                ? 'Moderate debt level'
                : 'High debt level'}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CompareArrows
                color={getMetricColor(data.assetTurnover, 'turnover')}
              />
              <Typography variant="body2" fontWeight="medium">
                Asset Turnover Ratio
              </Typography>
            </Box>
            <Typography variant="h5" fontWeight="bold">
              {data.assetTurnover.toFixed(2)}x
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Measures how efficiently assets generate revenue
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Radar Chart */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom textAlign="center">
          Financial Health Overview
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar
              name="Performance"
              dataKey="value"
              stroke="#2196f3"
              fill="#2196f3"
              fillOpacity={0.6}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </Box>

      {/* Metric Explanations */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          Understanding Your Metrics
        </Typography>
        <Typography variant="caption" component="div" sx={{ mb: 1 }}>
          <strong>Profit Margin:</strong> Net profit as a percentage of revenue.
          Higher is better (20%+ is excellent).
        </Typography>
        <Typography variant="caption" component="div" sx={{ mb: 1 }}>
          <strong>ROI:</strong> Return on investment as a percentage of expenses.
          Shows profitability relative to costs.
        </Typography>
        <Typography variant="caption" component="div" sx={{ mb: 1 }}>
          <strong>Cash Flow:</strong> Net difference between cash inflows and
          outflows. Positive indicates healthy liquidity.
        </Typography>
        <Typography variant="caption" component="div" sx={{ mb: 1 }}>
          <strong>Debt Ratio:</strong> Expenses as a percentage of revenue. Lower
          is better (below 30% is ideal).
        </Typography>
        <Typography variant="caption" component="div">
          <strong>Asset Turnover:</strong> How efficiently assets generate
          revenue. Higher values indicate better efficiency.
        </Typography>
      </Box>
    </Box>
  );
};

export default FinancialMetrics;
