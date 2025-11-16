/**
 * Rate Limit Usage Examples
 *
 * This file demonstrates how to use the Redis-based rate limiting
 * in the permission service.
 */

import { permissionService, DataScope } from './app/backend/src/services/permission.service';

async function exampleUsage() {
  console.log('=== Redis-Based Rate Limiting Examples ===\n');

  // Example 1: Grant permission with rate limit
  console.log('1. Granting permission with rate limit...');
  await permissionService.grantPermission({
    userId: 'user-123',
    resource: 'ticket',
    action: 'create',
    condition: {
      scope: DataScope.OWN,
      rateLimit: {
        maxActions: 10,
        windowMinutes: 60
      }
    },
    grantedBy: 'admin-456'
  });
  console.log('✓ Permission granted with 10 actions per hour limit\n');

  // Example 2: Check rate limit status
  console.log('2. Checking rate limit status...');
  const status = await permissionService.getRateLimitStatus(
    'ticket:create',
    'user-123',
    10,
    60
  );
  console.log('Rate Limit Status:', {
    allowed: status.allowed,
    current: status.current,
    limit: status.limit,
    remaining: status.remaining,
    resetAt: status.resetAt.toLocaleString()
  });
  console.log('');

  // Example 3: Simulate multiple actions
  console.log('3. Simulating 5 ticket creations...');
  for (let i = 1; i <= 5; i++) {
    const count = await permissionService.incrementRateLimit(
      'ticket:create',
      'user-123',
      60
    );
    console.log(`   Action ${i}: Count = ${count}`);
  }
  console.log('');

  // Example 4: Check permission (with rate limit enforcement)
  console.log('4. Checking permission (rate limit enforced)...');
  const permissionResult = await permissionService.checkPermission(
    'user-123',
    'ticket',
    'create'
  );
  console.log('Permission Result:', {
    granted: permissionResult.granted,
    reason: permissionResult.reason || 'Allowed',
    scope: permissionResult.scope
  });
  console.log('');

  // Example 5: Check current status after actions
  console.log('5. Current rate limit status...');
  const currentStatus = await permissionService.getRateLimitStatus(
    'ticket:create',
    'user-123',
    10,
    60
  );
  console.log('Current Status:', {
    used: `${currentStatus.current}/${currentStatus.limit}`,
    remaining: currentStatus.remaining,
    allowed: currentStatus.allowed,
    resetAt: currentStatus.resetAt.toLocaleString()
  });
  console.log('');

  // Example 6: Simulate exceeding the limit
  console.log('6. Simulating rate limit exceeded...');
  for (let i = 1; i <= 6; i++) {
    await permissionService.incrementRateLimit(
      'ticket:create',
      'user-123',
      60
    );
  }

  const exceededCheck = await permissionService.checkPermission(
    'user-123',
    'ticket',
    'create'
  );
  console.log('After exceeding limit:', {
    granted: exceededCheck.granted,
    reason: exceededCheck.reason
  });
  console.log('');

  // Example 7: Reset rate limit (admin action)
  console.log('7. Admin resets rate limit...');
  await permissionService.resetRateLimit(
    'ticket:create',
    'user-123',
    60
  );
  console.log('✓ Rate limit reset\n');

  // Example 8: Verify reset worked
  console.log('8. Verifying reset...');
  const afterReset = await permissionService.getRateLimitStatus(
    'ticket:create',
    'user-123',
    10,
    60
  );
  console.log('After Reset:', {
    current: afterReset.current,
    allowed: afterReset.allowed,
    remaining: afterReset.remaining
  });
  console.log('');

  // Example 9: Different rate limits for different actions
  console.log('9. Setting up different rate limits...');

  // Strict limit for expensive operations
  await permissionService.grantPermission({
    userId: 'user-123',
    resource: 'report',
    action: 'generate',
    condition: {
      scope: DataScope.OWN,
      rateLimit: {
        maxActions: 5,
        windowMinutes: 60
      }
    },
    grantedBy: 'admin-456'
  });

  // Lenient limit for viewing
  await permissionService.grantPermission({
    userId: 'user-123',
    resource: 'report',
    action: 'view',
    condition: {
      scope: DataScope.OWN,
      rateLimit: {
        maxActions: 100,
        windowMinutes: 60
      }
    },
    grantedBy: 'admin-456'
  });

  console.log('✓ Report generation: 5 per hour');
  console.log('✓ Report viewing: 100 per hour');
  console.log('');

  // Example 10: API endpoint integration example
  console.log('10. API Endpoint Integration Pattern:');
  console.log(`
  app.post('/api/tickets', async (req, res) => {
    const userId = req.user.id;

    // Check permission (includes rate limit)
    const permission = await permissionService.checkPermission(
      userId,
      'ticket',
      'create'
    );

    if (!permission.granted) {
      return res.status(permission.reason?.includes('Rate limit') ? 429 : 403)
        .json({ error: permission.reason });
    }

    // Create ticket...
    const ticket = await createTicket(req.body);
    res.json({ ticket });
  });
  `);

  console.log('\n=== Examples Complete ===');
}

// Run examples
exampleUsage()
  .then(() => {
    console.log('\n✓ All examples completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running examples:', error);
    process.exit(1);
  });
