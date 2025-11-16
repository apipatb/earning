import { Request, Response } from 'express';

export const graphqlDocsHandler = (req: Request, res: Response) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EarnTrack GraphQL API Documentation</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem 2rem;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .header p {
      font-size: 1.2rem;
      opacity: 0.9;
    }
    .content {
      padding: 2rem;
    }
    .section {
      margin-bottom: 3rem;
    }
    .section h2 {
      color: #667eea;
      font-size: 1.8rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #667eea;
    }
    .section h3 {
      color: #764ba2;
      font-size: 1.3rem;
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
    }
    .endpoint {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
      border-left: 4px solid #667eea;
    }
    .endpoint code {
      background: #e9ecef;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      color: #495057;
    }
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-top: 1rem;
    }
    .feature-card {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 8px;
      border-left: 4px solid #764ba2;
    }
    .feature-card h4 {
      color: #495057;
      margin-bottom: 0.5rem;
    }
    .feature-card ul {
      list-style: none;
      padding-left: 1rem;
    }
    .feature-card li:before {
      content: "→ ";
      color: #764ba2;
      font-weight: bold;
    }
    .code-block {
      background: #282c34;
      color: #abb2bf;
      padding: 1.5rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1rem 0;
    }
    .code-block pre {
      margin: 0;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }
    .btn {
      display: inline-block;
      padding: 0.8rem 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 1rem;
      transition: transform 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
    }
    .alert {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 1rem;
      border-radius: 4px;
      margin: 1rem 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 EarnTrack GraphQL API</h1>
      <p>Modern GraphQL API for comprehensive earnings and business management</p>
    </div>

    <div class="content">
      <div class="section">
        <h2>Getting Started</h2>
        <div class="endpoint">
          <strong>GraphQL Endpoint:</strong> <code>POST /api/graphql</code>
        </div>
        ${isDevelopment ? `
        <div class="endpoint">
          <strong>GraphQL Playground:</strong> <code>GET /api/graphql</code> (Development Only)
        </div>
        ` : ''}
        <div class="endpoint">
          <strong>Subscriptions (WebSocket):</strong> <code>WS /api/graphql/subscriptions</code>
        </div>

        <h3>Authentication</h3>
        <p>All requests require a JWT token in the Authorization header:</p>
        <div class="code-block">
<pre>Authorization: Bearer YOUR_JWT_TOKEN</pre>
        </div>

        <h3>Example Query</h3>
        <div class="code-block">
<pre>query GetEarnings {
  earnings(filter: {
    startDate: "2024-01-01"
    endDate: "2024-12-31"
    limit: 10
  }) {
    earnings {
      id
      amount
      date
      platform {
        name
        color
      }
    }
    total
    hasMore
  }
}</pre>
        </div>

        <h3>Example Mutation</h3>
        <div class="code-block">
<pre>mutation CreateEarning {
  createEarning(input: {
    platformId: "platform-id"
    date: "2024-11-16"
    amount: 150.00
    hours: 5.0
    notes: "Freelance project"
  }) {
    id
    amount
    hourlyRate
    platform {
      name
    }
  }
}</pre>
        </div>
      </div>

      <div class="section">
        <h2>Available Features</h2>
        <div class="feature-grid">
          <div class="feature-card">
            <h4>👤 User Management</h4>
            <ul>
              <li>Authentication (register, login)</li>
              <li>User profile management</li>
              <li>Account operations</li>
            </ul>
          </div>

          <div class="feature-card">
            <h4>💰 Earnings</h4>
            <ul>
              <li>CRUD operations</li>
              <li>Platform-based tracking</li>
              <li>Real-time updates</li>
              <li>Hourly rate calculations</li>
            </ul>
          </div>

          <div class="feature-card">
            <h4>📄 Invoices</h4>
            <ul>
              <li>Full invoice management</li>
              <li>Line items support</li>
              <li>Status tracking</li>
              <li>Overdue monitoring</li>
            </ul>
          </div>

          <div class="feature-card">
            <h4>👥 Customers</h4>
            <ul>
              <li>Customer database</li>
              <li>Purchase history</li>
              <li>LTV analytics</li>
              <li>Top customer reports</li>
            </ul>
          </div>

          <div class="feature-card">
            <h4>📦 Products</h4>
            <ul>
              <li>Product catalog</li>
              <li>Inventory tracking</li>
              <li>Sales integration</li>
              <li>Category management</li>
            </ul>
          </div>

          <div class="feature-card">
            <h4>📊 Analytics</h4>
            <ul>
              <li>Earnings summaries</li>
              <li>Platform breakdowns</li>
              <li>Daily/weekly/monthly views</li>
              <li>Performance metrics</li>
            </ul>
          </div>

          <div class="feature-card">
            <h4>🎯 Goals</h4>
            <ul>
              <li>Goal setting</li>
              <li>Progress tracking</li>
              <li>Status management</li>
              <li>Achievement notifications</li>
            </ul>
          </div>

          <div class="feature-card">
            <h4>💸 Expenses</h4>
            <ul>
              <li>Expense tracking</li>
              <li>Category organization</li>
              <li>Receipt management</li>
              <li>Date filtering</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Real-time Subscriptions</h2>
        <p>Subscribe to real-time updates using GraphQL subscriptions:</p>

        <h3>Available Subscriptions</h3>
        <div class="code-block">
<pre># Earning updates
subscription OnEarningCreated {
  earningCreated {
    id
    amount
    platform { name }
  }
}

# Invoice updates
subscription OnInvoicePaid {
  invoicePaid {
    id
    invoiceNumber
    totalAmount
    customer { name }
  }
}

# Goal progress
subscription OnGoalProgress {
  goalProgressUpdated {
    id
    title
    currentAmount
    targetAmount
  }
}</pre>
        </div>
      </div>

      <div class="section">
        <h2>Query Examples</h2>

        <h3>Get Analytics Summary</h3>
        <div class="code-block">
<pre>query GetAnalytics {
  analyticsSummary(filter: { period: "month" }) {
    totalEarnings
    totalHours
    avgHourlyRate
    byPlatform {
      platform { name }
      earnings
      percentage
    }
    dailyBreakdown {
      date
      earnings
      hours
    }
  }
}</pre>
        </div>

        <h3>Get Invoice Summary</h3>
        <div class="code-block">
<pre>query GetInvoiceSummary {
  invoiceSummary {
    totalInvoices
    paid
    pending
    overdue
    totalAmount
    paidAmount
    pendingAmount
  }
}</pre>
        </div>

        <h3>Get Top Customers</h3>
        <div class="code-block">
<pre>query GetTopCustomers {
  topCustomers(limit: 5) {
    name
    email
    totalPurchases
    purchaseCount
    averageOrderValue
  }
}</pre>
        </div>
      </div>

      <div class="section">
        <h2>Error Handling</h2>
        <p>The API returns standardized error codes:</p>
        <ul>
          <li><code>UNAUTHENTICATED</code> - Missing or invalid authentication</li>
          <li><code>FORBIDDEN</code> - Insufficient permissions</li>
          <li><code>NOT_FOUND</code> - Resource not found</li>
          <li><code>BAD_USER_INPUT</code> - Invalid input data</li>
          <li><code>RATE_LIMIT_EXCEEDED</code> - Too many requests</li>
          <li><code>INTERNAL_SERVER_ERROR</code> - Server error</li>
        </ul>
      </div>

      ${isDevelopment ? `
      <div class="section">
        <h2>Development Tools</h2>
        <a href="/api/graphql" class="btn">Open GraphQL Playground</a>
        <div class="alert">
          <strong>Note:</strong> GraphQL Playground is only available in development mode.
        </div>
      </div>
      ` : ''}

      <div class="section">
        <h2>Rate Limits</h2>
        <p>API requests are rate-limited per user:</p>
        <ul>
          <li><strong>Limit:</strong> 100 requests per minute per operation</li>
          <li><strong>Headers:</strong> Rate limit info included in response headers</li>
          <li><strong>Exceeded:</strong> Returns error with retry time</li>
        </ul>
      </div>

      <div class="section">
        <h2>Best Practices</h2>
        <ul>
          <li>Use field selection to request only the data you need</li>
          <li>Implement pagination for large datasets</li>
          <li>Use subscriptions for real-time features</li>
          <li>Handle errors gracefully in your client</li>
          <li>Cache responses when appropriate</li>
          <li>Use variables instead of inline values</li>
        </ul>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
};
