/**
 * Example: How to set up Apollo Provider in your React app
 *
 * Add this to your main App.tsx or index.tsx file
 */

import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './apollo-client';

function App() {
  return (
    <ApolloProvider client={apolloClient}>
      {/* Your app components */}
    </ApolloProvider>
  );
}

export default App;

/**
 * Example: Using GraphQL hooks in components
 */

// Example 1: Fetching earnings
import { useEarnings, useCreateEarning } from '@/hooks/graphql';

function EarningsComponent() {
  const { data, loading, error } = useEarnings({
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    limit: 10,
  });

  const [createEarning, { loading: creating }] = useCreateEarning();

  const handleCreate = async () => {
    try {
      await createEarning({
        variables: {
          input: {
            platformId: 'platform-id',
            date: new Date().toISOString(),
            amount: 150.00,
            hours: 5.0,
            notes: 'Freelance work',
          },
        },
      });
      // Handle success
    } catch (err) {
      // Handle error
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Earnings</h2>
      <button onClick={handleCreate} disabled={creating}>
        Add Earning
      </button>
      <ul>
        {data?.earnings.earnings.map((earning: any) => (
          <li key={earning.id}>
            {earning.platform.name}: ${earning.amount}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Example 2: Using subscriptions for real-time updates
import { useEarningCreatedSubscription } from '@/hooks/graphql';

function RealTimeEarnings() {
  const { data: subscriptionData } = useEarningCreatedSubscription();

  useEffect(() => {
    if (subscriptionData?.earningCreated) {
      console.log('New earning created:', subscriptionData.earningCreated);
      // Show notification or update UI
    }
  }, [subscriptionData]);

  return <div>Listening for new earnings...</div>;
}

// Example 3: Analytics with filters
import { useAnalyticsSummary } from '@/hooks/graphql';

function AnalyticsDashboard() {
  const { data, loading } = useAnalyticsSummary({
    period: 'month',
  });

  if (loading) return <div>Loading analytics...</div>;

  return (
    <div>
      <h2>Analytics Summary</h2>
      <p>Total Earnings: ${data?.analyticsSummary.totalEarnings}</p>
      <p>Total Hours: {data?.analyticsSummary.totalHours}</p>
      <p>Avg Hourly Rate: ${data?.analyticsSummary.avgHourlyRate}</p>

      <h3>By Platform</h3>
      <ul>
        {data?.analyticsSummary.byPlatform.map((platform: any) => (
          <li key={platform.platform.id}>
            {platform.platform.name}: ${platform.earnings} ({platform.percentage.toFixed(1)}%)
          </li>
        ))}
      </ul>
    </div>
  );
}

// Example 4: Invoice management
import { useInvoices, useMarkInvoicePaid } from '@/hooks/graphql';

function InvoiceList() {
  const { data, loading } = useInvoices({
    status: 'PENDING',
    limit: 20,
  });

  const [markPaid] = useMarkInvoicePaid();

  const handleMarkPaid = async (id: string) => {
    try {
      await markPaid({
        variables: {
          id,
          paymentMethod: 'Credit Card',
        },
      });
      // Show success message
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading invoices...</div>;

  return (
    <div>
      <h2>Pending Invoices</h2>
      <ul>
        {data?.invoices.invoices.map((invoice: any) => (
          <li key={invoice.id}>
            {invoice.invoiceNumber} - ${invoice.totalAmount}
            <button onClick={() => handleMarkPaid(invoice.id)}>
              Mark Paid
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
