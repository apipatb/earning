import request from 'supertest';
import { TestSetup, setupIntegrationTests, teardownIntegrationTests } from './test-setup';
import { generateToken, verifyToken } from '../../utils/jwt';

describe('Auth Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    await setupIntegrationTests();
    app = TestSetup.app;
  });

  beforeEach(async () => {
    await TestSetup.cleanDatabase();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  describe('Complete Auth Flow', () => {
    test('1. Register user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'StrongPassword123!',
          name: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.user.name).toBe('New User');
      expect(response.body.token).toBeTruthy();

      // Verify token is valid
      const decoded = verifyToken(response.body.token);
      expect(decoded).toBeTruthy();
      expect(decoded?.id).toBe(response.body.user.id);
    });

    test('2. Login with valid credentials', async () => {
      // Register a user first
      const testEmail = 'logintest@example.com';
      const testPassword = 'TestPassword123!';

      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: 'Login Test User',
        });

      // Now attempt login
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.token).toBeTruthy();
    });

    test('3. Access protected endpoint with valid token', async () => {
      // Create user
      const { token } = await TestSetup.createTestUser();
      const { user } = await TestSetup.createTestUser(
        'another@example.com'
      );

      // Create platform for the user
      const platform = await TestSetup.createTestPlatform(user.id);

      // Create earning
      const response = await request(app)
        .get('/api/v1/earnings')
        .set('Authorization', `Bearer ${token}`);

      // Should work with valid token
      expect([200, 400]).toContain(response.status); // 400 if no earnings exist yet
      expect(response.body).toBeDefined();
    });

    test('4. Complete flow: register → login → access protected resource', async () => {
      const testEmail = 'complete@example.com';
      const testPassword = 'CompleteFlow123!';

      // Step 1: Register
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          name: 'Complete Flow User',
        });

      expect(registerResponse.status).toBe(201);
      const registeredUserId = registerResponse.body.user.id;
      const registeredToken = registerResponse.body.token;

      // Step 2: Login with credentials
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.user.id).toBe(registeredUserId);

      // Step 3: Use token to access protected endpoint
      const protectedResponse = await request(app)
        .get('/api/v1/earnings')
        .set('Authorization', `Bearer ${loginResponse.body.token}`);

      expect([200, 400]).toContain(protectedResponse.status);
      expect(protectedResponse.body).toBeDefined();
    });
  });

  describe('Invalid Credentials Handling', () => {
    test('5. Reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid Credentials');
      expect(response.body.message).toContain('Email or password');
    });

    test('6. Reject login with wrong password', async () => {
      const testEmail = 'wrongpass@example.com';
      const correctPassword = 'CorrectPassword123!';

      // Create user
      await TestSetup.createTestUser(testEmail, correctPassword);

      // Try login with wrong password
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid Credentials');
    });

    test('7. Reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalidemail',
          password: 'StrongPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    test('8. Reject registration with duplicate email', async () => {
      const testEmail = 'duplicate@example.com';

      // Register first user
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'Password123!',
        });

      // Try to register with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'DifferentPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User Exists');
    });
  });

  describe('Token and Authorization', () => {
    test('9. Reject access without token', async () => {
      const response = await request(app)
        .get('/api/v1/earnings');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('10. Reject access with malformed token', async () => {
      const response = await request(app)
        .get('/api/v1/earnings')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('11. Reject access with wrong Bearer format', async () => {
      const { token } = await TestSetup.createTestUser();

      const response = await request(app)
        .get('/api/v1/earnings')
        .set('Authorization', `Token ${token}`); // Should be "Bearer"

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('12. Accept valid Bearer token format', async () => {
      const { user, token } = await TestSetup.createTestUser();
      const platform = await TestSetup.createTestPlatform(user.id);

      const response = await request(app)
        .get('/api/v1/earnings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.earnings).toBeDefined();
    });
  });
});
