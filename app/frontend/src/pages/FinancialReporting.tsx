import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Assessment,
} from '@mui/icons-material';
import IncomeStatement from '../components/IncomeStatement';
import CashFlowAnalysis from '../components/CashFlowAnalysis';
import TaxReport from '../components/TaxReport';
import FinancialMetrics from '../components/FinancialMetrics';
import { useFinancialStore } from '../store/financialStore';

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

const FinancialReporting: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('monthly');
  const [loading, setLoading] = useState(false);

  const {
    incomeStatement,
    cashFlow,
    taxReport,
    metrics,
    fetchIncomeStatement,
    fetchCashFlow,
    fetchTaxReport,
    fetchMetrics,
  } = useFinancialStore();

  useEffect(() => {
    loadFinancialData();
  }, [selectedPeriod]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchIncomeStatement(selectedPeriod),
        fetchCashFlow(selectedPeriod),
        fetchTaxReport(selectedPeriod),
        fetchMetrics(selectedPeriod),
      ]);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period);
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined) return '0.00%';
    return `${value.toFixed(2)}%`;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Financial Reporting
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive financial analysis and insights
        </Typography>
      </Box>

      {/* Period Selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Select Period</Typography>
          <ButtonGroup variant="outlined" size="small">
            <Button
              onClick={() => handlePeriodChange('daily')}
              variant={selectedPeriod === 'daily' ? 'contained' : 'outlined'}
            >
              Daily
            </Button>
            <Button
              onClick={() => handlePeriodChange('weekly')}
              variant={selectedPeriod === 'weekly' ? 'contained' : 'outlined'}
            >
              Weekly
            </Button>
            <Button
              onClick={() => handlePeriodChange('monthly')}
              variant={selectedPeriod === 'monthly' ? 'contained' : 'outlined'}
            >
              Monthly
            </Button>
            <Button
              onClick={() => handlePeriodChange('quarterly')}
              variant={selectedPeriod === 'quarterly' ? 'contained' : 'outlined'}
            >
              Quarterly
            </Button>
            <Button
              onClick={() => handlePeriodChange('annual')}
              variant={selectedPeriod === 'annual' ? 'contained' : 'outlined'}
            >
              Annual
            </Button>
          </ButtonGroup>
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <>
          {/* Key Metrics Dashboard */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUp color="success" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Total Revenue
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(incomeStatement?.totalRevenue)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingDown color="error" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Total Expenses
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(incomeStatement?.totalExpenses)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AccountBalance color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Net Profit
                    </Typography>
                  </Box>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color={
                      (incomeStatement?.netProfit ?? 0) >= 0
                        ? 'success.main'
                        : 'error.main'
                    }
                  >
                    {formatCurrency(incomeStatement?.netProfit)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Assessment color="info" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Profit Margin
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight="bold">
                    {formatPercentage(metrics?.profitMargin)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Financial Statements */}
          <Grid container spacing={3}>
            {/* Income Statement */}
            <Grid item xs={12} lg={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Income Statement
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <IncomeStatement data={incomeStatement} />
              </Paper>
            </Grid>

            {/* Cash Flow Analysis */}
            <Grid item xs={12} lg={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Cash Flow Analysis
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <CashFlowAnalysis data={cashFlow} />
              </Paper>
            </Grid>

            {/* Financial Metrics */}
            <Grid item xs={12} lg={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Financial Metrics
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <FinancialMetrics data={metrics} />
              </Paper>
            </Grid>

            {/* Tax Report */}
            <Grid item xs={12} lg={6}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Tax Report
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TaxReport data={taxReport} />
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default FinancialReporting;
