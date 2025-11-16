// Load test environment variables
const dotenv = require('dotenv');

// Load .env.test first, then .env as fallback
dotenv.config({ path: '.env.test' });
dotenv.config(); // Fallback to .env

// Set test mode
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Enable mock database for integration tests
if (process.env.USE_MOCK_DATABASE !== 'false') {
  process.env.USE_MOCK_DATABASE = 'true';
}

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
