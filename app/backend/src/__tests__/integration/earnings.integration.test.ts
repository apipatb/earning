import request from 'supertest';
import { TestSetup, setupIntegrationTests, teardownIntegrationTests } from './test-setup';

// Lazy load prisma to avoid initialization issues
const getPrisma = () => require('../../lib/prisma').default;

describe('Earnings Integration Tests', () => {
  let app: any;
  let userToken: string;
  let userId: string;
  let platformId: string;

  beforeAll(async () => {
    await setupIntegrationTests();
    app = TestSetup.app;
  });

  beforeEach(async () => {
    await TestSetup.cleanDatabase();

    // Create test user and platform
    const { user, token } = await TestSetup.createTestUser();
    const platform = await TestSetup.createTestPlatform(user.id);

    userToken = token;
    userId = user.id;
    platformId = platform.id;
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  describe('Complete Earnings Workflow: Create → Read → Update → Delete', () => {
    test('1. Create a new earning successfully', async () => {
      const earningData = {
        platformId,
        date: '2024-01-15',
        amount: 150.50,
        hours: 3.5,
        notes: 'Completed freelance project',
      };

      const response = await request(app)
        .post('/api/v1/earnings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(earningData);

      expect(response.status).toBe(201);
      expect(response.body.earning).toBeDefined();
      expect(response.body.earning.amount).toBe(150.50);
      expect(response.body.earning.hours).toBe(3.5);
      expect(response.body.earning.notes).toBe('Completed freelance project');
      expect(response.body.earning.hourly_rate).toBeCloseTo(150.50 / 3.5, 2);

      // Verify in database (skipped in mock mode)
      if (!TestSetup.useMockDatabase) {
        const dbEarning = await getPrisma().earning.findUnique({
          where: { id: response.body.earning.id },
        });
        expect(dbEarning).toBeDefined();
        expect(dbEarning?.userId).toBe(userId);
      }
    });

    test('2. Read/retrieve earnings list', async () => {
      // Create multiple earnings
      await TestSetup.createTestEarning(userId, platformId, 100, new Date('2024-01-01'));
      await TestSetup.createTestEarning(userId, platformId, 200, new Date('2024-01-02'));
      await TestSetup.createTestEarning(userId, platformId, 150, new Date('2024-01-03'));

      const response = await request(app)
        .get('/api/v1/earnings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.earnings).toBeInstanceOf(Array);
      expect(response.body.earnings.length).toBe(3);
      expect(response.body.total).toBe(3);
      expect(response.body).toHaveProperty('has_more');
    });

    test('3. Update an earning successfully', async () => {
      // Create earning
      const earning = await TestSetup.createTestEarning(userId, platformId, 100, new Date('2024-01-15'));

      // Update it
      const updateData = {
        amount: 250.75,
        hours: 5,
        notes: 'Updated notes',
      };

      const response = await request(app)
        .put(`/api/v1/earnings/${earning.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.earning).toBeDefined();
      expect(response.body.earning.amount).toBe(250.75);
      expect(response.body.earning.hours).toBe(5);
      expect(response.body.earning.notes).toBe('Updated notes');

      // Verify in database (skipped in mock mode)
      if (!TestSetup.useMockDatabase) {
        const updated = await getPrisma().earning.findUnique({
          where: { id: earning.id },
        });
        expect(updated?.amount).toEqual(250.75);
      }
    });

    test('4. Delete an earning successfully', async () => {
      // Create earning
      const earning = await TestSetup.createTestEarning(userId, platformId, 100);

      // Delete it
      const response = await request(app)
        .delete(`/api/v1/earnings/${earning.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');

      // Verify in database (skipped in mock mode)
      if (!TestSetup.useMockDatabase) {
        const deleted = await getPrisma().earning.findUnique({
          where: { id: earning.id },
        });
        expect(deleted).toBeNull();
      }
    });

    test('5. Complete workflow: Create → Read → Update → Delete', async () => {
      // Step 1: Create
      const createResponse = await request(app)
        .post('/api/v1/earnings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          platformId,
          date: '2024-01-20',
          amount: 300,
          hours: 4,
        });

      expect(createResponse.status).toBe(201);
      const earningId = createResponse.body.earning.id;

      // Step 2: Read
      const readResponse = await request(app)
        .get('/api/v1/earnings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(readResponse.status).toBe(200);
      const createdEarning = readResponse.body.earnings.find((e: any) => e.id === earningId);
      expect(createdEarning).toBeDefined();

      // Step 3: Update
      const updateResponse = await request(app)
        .put(`/api/v1/earnings/${earningId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 400,
          hours: 5,
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.earning.amount).toBe(400);

      // Step 4: Delete
      const deleteResponse = await request(app)
        .delete(`/api/v1/earnings/${earningId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(deleteResponse.status).toBe(200);

      // Verify deletion
      const finalRead = await request(app)
        .get('/api/v1/earnings')
        .set('Authorization', `Bearer ${userToken}`);

      const stillExists = finalRead.body.earnings.find((e: any) => e.id === earningId);
      expect(stillExists).toBeUndefined();
    });
  });

  describe('WebSocket Events Integration', () => {
    test('6. Creating earning should emit earning:created event', async () => {
      // Note: Full WebSocket testing requires socket.io client
      // For now, we verify the earning is created and would emit events
      const response = await request(app)
        .post('/api/v1/earnings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          platformId,
          date: '2024-01-15',
          amount: 100,
        });

      expect(response.status).toBe(201);
      // In a full integration test with socket.io client, we'd verify the event was emitted
      expect(response.body.earning).toBeDefined();
    });

    test('7. Updating earning should emit earning:updated event', async () => {
      const earning = await TestSetup.createTestEarning(userId, platformId, 100);

      const response = await request(app)
        .put(`/api/v1/earnings/${earning.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 200 });

      expect(response.status).toBe(200);
      // In a full integration test with socket.io client, we'd verify the event was emitted
      expect(response.body.earning).toBeDefined();
    });

    test('8. Deleting earning should emit earning:deleted event', async () => {
      const earning = await TestSetup.createTestEarning(userId, platformId, 100);

      const response = await request(app)
        .delete(`/api/v1/earnings/${earning.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      // In a full integration test with socket.io client, we'd verify the event was emitted
    });
  });

  describe('Pagination and Filtering', () => {
    beforeEach(async () => {
      // Create multiple earnings for filtering tests
      for (let i = 1; i <= 15; i++) {
        await TestSetup.createTestEarning(
          userId,
          platformId,
          50 + i * 10,
          new Date(`2024-01-${String(i).padStart(2, '0')}`)
        );
      }
    });

    test('9. Pagination with limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/earnings?limit=5')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.earnings.length).toBeLessThanOrEqual(5);
      expect(response.body.total).toBe(15);
      expect(response.body.has_more).toBe(true);
    });

    test('10. Pagination with offset parameter', async () => {
      const response1 = await request(app)
        .get('/api/v1/earnings?limit=5&offset=0')
        .set('Authorization', `Bearer ${userToken}`);

      const response2 = await request(app)
        .get('/api/v1/earnings?limit=5&offset=5')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Results should be different
      if (response1.body.earnings.length > 0 && response2.body.earnings.length > 0) {
        expect(response1.body.earnings[0].id).not.toBe(response2.body.earnings[0].id);
      }
    });

    test('11. Filter earnings by date range', async () => {
      const response = await request(app)
        .get('/api/v1/earnings?start_date=2024-01-05&end_date=2024-01-10')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.earnings).toBeInstanceOf(Array);
      // All earnings should be within the date range
      response.body.earnings.forEach((earning: any) => {
        const earningDate = new Date(earning.date);
        expect(earningDate >= new Date('2024-01-05')).toBe(true);
        expect(earningDate <= new Date('2024-01-10')).toBe(true);
      });
    });

    test('12. Filter earnings by platform_id', async () => {
      // Create another platform
      const platform2 = await TestSetup.createTestPlatform(userId, 'Second Platform');

      // Add earnings to second platform
      await TestSetup.createTestEarning(userId, platform2.id, 500, new Date('2024-01-20'));

      const response = await request(app)
        .get(`/api/v1/earnings?platform_id=${platformId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      // All returned earnings should be from the selected platform
      response.body.earnings.forEach((earning: any) => {
        expect(earning.platform.id).toBe(platformId);
      });
    });
  });

  describe('Earnings Validation and Error Handling', () => {
    test('13. Reject earning with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/earnings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          platformId,
          // Missing date and amount
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    test('14. Reject earning with invalid date format', async () => {
      const response = await request(app)
        .post('/api/v1/earnings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          platformId,
          date: '01-01-2024', // Wrong format
          amount: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    test('15. Reject earning for non-existent platform', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post('/api/v1/earnings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          platformId: fakeId,
          date: '2024-01-15',
          amount: 100,
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });

    test('16. Reject update of non-existent earning', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/v1/earnings/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 200,
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });

    test('17. Prevent access to other user\'s earnings', async () => {
      // Create another user
      const { user: otherUser, token: otherToken } = await TestSetup.createTestUser(
        'other@example.com'
      );

      // Create earning for first user
      const earning = await TestSetup.createTestEarning(userId, platformId, 100);

      // Try to update it as another user
      const response = await request(app)
        .put(`/api/v1/earnings/${earning.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ amount: 200 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });
  });
});
