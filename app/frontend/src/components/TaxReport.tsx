import React from 'react';
import { Box, Typography, Divider, Chip } from '@mui/material';
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

interface TaxReportData {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalTaxLiability: number;
  taxByCategory: Array<{
    categoryName: string;
    percentage: number;
    baseAmount: number;
    taxAmount: number;
  }>;
  deductibleExpenses: number;
  taxableIncome: number;
  quarterlyBreakdown?: Array<{
    quarter: string;
    taxLiability: number;
  }>;
}

interface Props {
  data: TaxReportData | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const TaxReport: React.FC<Props> = ({ data }) => {
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

  return (
    <Box>
      {/* Tax Summary */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
          }}
        >
          <Typography variant="body1" fontWeight="medium">
            Taxable Income
          </Typography>
          <Typography variant="body1" fontWeight="bold">
            {formatCurrency(data.taxableIncome)}
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
            Deductible Expenses
          </Typography>
          <Typography variant="body1" color="success.main" fontWeight="bold">
            {formatCurrency(data.deductibleExpenses)}
          </Typography>
        </Box>
        <Divider />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
            bgcolor: 'warning.lighter',
            px: 1,
            borderRadius: 1,
            mt: 1,
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Total Tax Liability
          </Typography>
          <Typography variant="h6" fontWeight="bold" color="warning.main">
            {formatCurrency(data.totalTaxLiability)}
          </Typography>
        </Box>
      </Box>

      {/* Tax by Category */}
      {data.taxByCategory.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Tax Breakdown by Category
          </Typography>
          {data.taxByCategory.map((category, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 0.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    {category.categoryName}
                  </Typography>
                  <Chip
                    label={`${category.percentage}%`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Box>
                <Typography variant="body2" fontWeight="bold">
                  {formatCurrency(category.taxAmount)}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Base Amount: {formatCurrency(category.baseAmount)}
              </Typography>
              <Divider sx={{ mt: 1 }} />
            </Box>
          ))}
        </Box>
      )}

      {/* Tax Category Pie Chart */}
      {data.taxByCategory.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Tax Distribution
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.taxByCategory.map((cat) => ({
                  name: cat.categoryName,
                  value: cat.taxAmount,
                }))}
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
                {data.taxByCategory.map((entry, index) => (
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

      {/* Quarterly Breakdown */}
      {data.quarterlyBreakdown && data.quarterlyBreakdown.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">
            Quarterly Breakdown
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.quarterlyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="taxLiability" fill="#ff9800" name="Tax Liability" />
            </BarChart>
          </ResponsiveContainer>

          {/* Quarterly Table */}
          <Box sx={{ mt: 2 }}>
            {data.quarterlyBreakdown.map((quarter, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 0.5,
                }}
              >
                <Typography variant="body2">{quarter.quarter}</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatCurrency(quarter.taxLiability)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* No Tax Categories Message */}
      {data.taxByCategory.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 3,
            bgcolor: 'action.hover',
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No tax categories configured. Add tax categories to see detailed tax
            breakdowns.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TaxReport;
