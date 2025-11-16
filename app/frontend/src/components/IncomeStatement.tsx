import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface IncomeStatementData {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  taxLiability: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
  revenueBreakdown: {
    earnings: number;
    sales: number;
    invoices: number;
  };
  expenseBreakdown: {
    byCategory: Record<string, number>;
    total: number;
  };
}

interface Props {
  data: IncomeStatementData | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const IncomeStatement: React.FC<Props> = ({ data }) => {
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

  // Revenue breakdown data for pie chart
  const revenueData = [
    { name: 'Earnings', value: data.revenueBreakdown.earnings },
    { name: 'Sales', value: data.revenueBreakdown.sales },
    { name: 'Invoices', value: data.revenueBreakdown.invoices },
  ].filter((item) => item.value > 0);

  // Summary data for bar chart
  const summaryData = [
    {
      name: 'Financial Summary',
      Revenue: data.totalRevenue,
      Expenses: data.totalExpenses,
      Profit: data.netProfit,
    },
  ];

  // Expense breakdown data for pie chart
  const expenseData = Object.entries(data.expenseBreakdown.byCategory).map(
    ([category, amount]) => ({
      name: category,
      value: amount,
    })
  );

  return (
    <Box>
      {/* Summary Table */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
          }}
        >
          <Typography variant="body1" fontWeight="medium">
            Total Revenue
          </Typography>
          <Typography variant="body1" color="success.main" fontWeight="bold">
            {formatCurrency(data.totalRevenue)}
          </Typography>
        </Box>
        <Divider />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
          }}
        >
          <Typography variant="body1" fontWeight="medium">
            Total Expenses
          </Typography>
          <Typography variant="body1" color="error.main" fontWeight="bold">
            {formatCurrency(data.totalExpenses)}
          </Typography>
        </Box>
        <Divider />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
          }}
        >
          <Typography variant="body1" fontWeight="medium">
            Gross Profit
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {formatCurrency(data.grossProfit)}
          </Typography>
        </Box>
        <Divider />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
          }}
        >
          <Typography variant="body1" fontWeight="medium">
            Tax Liability
          </Typography>
          <Typography variant="body1" color="warning.main" fontWeight="bold">
            {formatCurrency(data.taxLiability)}
          </Typography>
        </Box>
        <Divider />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
            bgcolor: 'action.hover',
            px: 1,
            borderRadius: 1,
            mt: 1,
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Net Profit
          </Typography>
          <Typography
            variant="h6"
            fontWeight="bold"
            color={data.netProfit >= 0 ? 'success.main' : 'error.main'}
          >
            {formatCurrency(data.netProfit)}
          </Typography>
        </Box>
      </Box>

      {/* Revenue & Profit Bar Chart */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Revenue vs Expenses
        </Typography>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={summaryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Bar dataKey="Revenue" fill="#4caf50" />
            <Bar dataKey="Expenses" fill="#f44336" />
            <Bar dataKey="Profit" fill="#2196f3" />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Revenue Breakdown */}
      {revenueData.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Revenue Breakdown
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={revenueData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {revenueData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      )}

      {/* Expense Breakdown */}
      {expenseData.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Expense Breakdown
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={expenseData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {expenseData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
};

export default IncomeStatement;
