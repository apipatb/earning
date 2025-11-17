/**
 * Example usage of the subscription usage tracking features
 * This file demonstrates how to use the new usage tracking functionality
 */

import { subscriptionService } from './subscription.service';

// Example 1: Record API usage
async function recordApiCall(subscriptionId: string) {
  await subscriptionService.recordUsage(
    subscriptionId,
    'api_calls',
    1, // quantity
    {
      endpoint: '/api/customers',
      method: 'GET',
      responseTime: 150,
    }
  );
}

// Example 2: Get current subscription usage
async function checkUsage(subscriptionId: string) {
  const usage = await subscriptionService.getSubscriptionUsage(
    subscriptionId,
    'api_calls'
  );

  console.log(`API Calls: ${usage.usage} / ${usage.limit}`);
  console.log(`Usage: ${usage.percentage}%`);
  console.log(`Period: ${usage.currentPeriodStart} to ${usage.currentPeriodEnd}`);
}

// Example 3: Check if user is near limit
async function checkLimits(subscriptionId: string) {
  const usage = await subscriptionService.getSubscriptionUsage(
    subscriptionId,
    'api_calls'
  );

  // Check with default 80% threshold
  if (subscriptionService.isNearLimit(usage.usage, usage.limit)) {
    console.warn('User is approaching API call limit!');
  }

  // Check with custom 90% threshold
  if (subscriptionService.isNearLimit(usage.usage, usage.limit, 90)) {
    console.error('User is at 90% of API call limit!');
  }

  // Check if over limit
  if (subscriptionService.isOverLimit(usage.usage, usage.limit)) {
    console.error('User has exceeded API call limit!');
    // Take action: block API calls, send notification, etc.
  }
}

// Example 4: Get detailed usage status
async function getDetailedStatus(subscriptionId: string) {
  const usage = await subscriptionService.getSubscriptionUsage(
    subscriptionId,
    'storage_mb'
  );

  const status = subscriptionService.getUsageStatus(usage.usage, usage.limit);

  console.log({
    usage: status.usage,
    limit: status.limit,
    remaining: status.remaining,
    percentage: status.percentage,
    isNearLimit: status.isNearLimit,
    isOverLimit: status.isOverLimit,
    status: status.status, // 'OK', 'WARNING', or 'EXCEEDED'
  });
}

// Example 5: Clear cache after manual usage changes
async function clearCacheExample(userId: string) {
  // After deleting files or modifying usage manually
  subscriptionService.clearUserCache(userId);

  // Now the next usage query will fetch fresh data
}

// Example 6: Multiple metrics
async function checkAllMetrics(subscriptionId: string) {
  const metrics = [
    'api_calls',
    'whatsapp_messages',
    'storage_mb',
    'team_members',
    'customers',
    'invoices',
  ];

  for (const metric of metrics) {
    try {
      const usage = await subscriptionService.getSubscriptionUsage(
        subscriptionId,
        metric
      );

      const status = subscriptionService.getUsageStatus(usage.usage, usage.limit);

      console.log(`${metric}:`, {
        usage: usage.usage,
        limit: usage.limit,
        percentage: status.percentage,
        status: status.status,
      });
    } catch (error) {
      console.error(`Failed to get usage for ${metric}:`, error);
    }
  }
}

export {
  recordApiCall,
  checkUsage,
  checkLimits,
  getDetailedStatus,
  clearCacheExample,
  checkAllMetrics,
};
