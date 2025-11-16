import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Divider } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp, TrendingDown, AccountBalance } from '@mui/icons-material';

interface CashFlowData {
  period: {
    startDate: Date;
    endDate: Date;
  };
  operatingCashFlow: number;
  cashInflows: {
    earnings: number;
    sales: number;
    invoices: number;
    total: number;
  };
  cashOutflows: {
    expenses: number;
    taxPayments: number;
    total: number;
  };
  netCashFlow: number;
  cashFlowTrend: Array<{
    date: string;
    amount: number;
  }>;
}

interface Props {
  data: CashFlowData | null;
}

const CashFlowAnalysis: React.FC<Props> = ({ data }) => {
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

  // Prepare trend data for chart
  const trendData = data.cashFlowTrend.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    amount: item.amount,
  }));

  // Calculate cumulative cash flow
  let cumulative = 0;
  const cumulativeData = data.cashFlowTrend.map((item) => {
    cumulative += item.amount;
    return {
      date: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      daily: item.amount,
      cumulative: cumulative,
    };
  });

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp color="success" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Cash Inflows
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="success.main">
                {formatCurrency(data.cashInflows.total)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingDown color="error" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Cash Outflows
              </Typography>
              <Typography variant="h6" fontWeight="bold" color="error.main">
                {formatCurrency(data.cashOutflows.total)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <AccountBalance color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Net Cash Flow
              </Typography>
              <Typography
                variant="h6"
                fontWeight="bold"
                color={data.netCashFlow >= 0 ? 'success.main' : 'error.main'}
              >
                {formatCurrency(data.netCashFlow)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cash Inflows Breakdown */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          Cash Inflows
        </Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 0.5,
          }}
        >
          <Typography variant="body2">Earnings</Typography>
          <Typography variant="body2" fontWeight="medium">
            {formatCurrency(data.cashInflows.earnings)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 0.5,
          }}
        >
          <Typography variant="body2">Sales</Typography>
          <Typography variant="body2" fontWeight="medium">
            {formatCurrency(data.cashInflows.sales)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 0.5,
          }}
        >
          <Typography variant="body2">Invoices</Typography>
          <Typography variant="body2" fontWeight="medium">
            {formatCurrency(data.cashInflows.invoices)}
          </Typography>
        </Box>
        <Divider sx={{ my: 1 }} />
      </Box>

      {/* Cash Outflows Breakdown */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          Cash Outflows
        </Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 0.5,
          }}
        >
          <Typography variant="body2">Expenses</Typography>
          <Typography variant="body2" fontWeight="medium">
            {formatCurrency(data.cashOutflows.expenses)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 0.5,
          }}
        >
          <Typography variant="body2">Tax Payments</Typography>
          <Typography variant="body2" fontWeight="medium">
            {formatCurrency(data.cashOutflows.taxPayments)}
          </Typography>
        </Box>
        <Divider sx={{ my: 1 }} />
      </Box>

      {/* Daily Cash Flow Trend */}
      {trendData.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Daily Cash Flow
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#2196f3"
                strokeWidth={2}
                name="Daily Cash Flow"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Cumulative Cash Flow */}
      {cumulativeData.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Cumulative Cash Flow
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#4caf50"
                fill="#4caf50"
                fillOpacity={0.3}
                name="Cumulative Flow"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
};

export default CashFlowAnalysis;
