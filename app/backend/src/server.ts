import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import logger, { logInfo, logDebug, logError } from './lib/logger';
import { swaggerSpec } from './lib/swagger';
import { initializeRedisClient, disconnectRedis } from './lib/redis';
import cacheMiddleware from './middleware/cache.middleware';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import platformRoutes from './routes/platform.routes';
import earningRoutes from './routes/earning.routes';
import analyticsRoutes from './routes/analytics.routes';
import goalRoutes from './routes/goal.routes';
import productRoutes from './routes/product.routes';
import saleRoutes from './routes/sale.routes';
import inventoryRoutes from './routes/inventory.routes';
import customerRoutes from './routes/customer.routes';
import expenseRoutes from './routes/expense.routes';
import invoiceRoutes from './routes/invoice.routes';
import uploadRoutes from './routes/upload.routes';
import notificationRoutes from './routes/notification.routes';
import jobsRoutes from './routes/jobs.routes';
import metricsRoutes from './routes/metrics.routes';
import exportRoutes from './routes/export.routes';
import quotaRoutes from './routes/quota.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { notFound } from './middleware/notFound.middleware';
import loggingMiddleware from './middleware/logging.middleware';
import requestResponseMiddleware from './middleware/request-response.middleware';
import securityHeadersMiddleware from './middleware/security-headers.middleware';
import sanitizationMiddleware from './middleware/sanitization.middleware';
import inputValidationMiddleware from './middleware/input-validation.middleware';
import {
  globalLimiter,
  authLimiter,
  uploadLimiter,
} from './middleware/rate-limit.middleware';
import metricsFilterMiddleware from './middleware/metrics.middleware';
import { quotaMiddleware, quotaInfoMiddleware } from './middleware/quota.middleware';
import { registerMetrics, metricsRegistry } from './lib/metrics';

// Import WebSocket
import { initializeWebSocket } from './websocket/ws';
import { wsAuthMiddleware } from './middleware/ws-auth.middleware';
import { setupEarningsEvents } from './websocket/events/earnings.events';
import { setupNotificationEvents } from './websocket/events/notifications.events';

// Import Job Scheduler
import { scheduler } from './jobs/scheduler';

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Security middleware (in proper order for defense in depth)
// 1. Helmet for XSS/CSRF/security headers protection
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));

// 2. Security headers middleware
app.use(securityHeadersMiddleware);

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'];
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (!IS_PRODUCTION) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

// 3. CORS middleware
app.use(cors(corsOptions));

// 4. Body parsing middleware
app.use(express.json({ limit: '50mb' })); // Limit payload size (supports file uploads)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 5. Logging middleware
app.use(loggingMiddleware); // Request/Response logging

// 5a. Request/Response interceptor middleware (Request IDs and tracing)
app.use(requestResponseMiddleware);

// 5b. Metrics middleware (Performance monitoring)
registerMetrics();
app.use(metricsFilterMiddleware); // Only tracks /api/* routes

// 5b. Cache middleware (HTTP response caching)
app.use(cacheMiddleware);

// 6. Input sanitization middleware (removes XSS, trims whitespace)
app.use(sanitizationMiddleware);

// 7. Input validation middleware (detects injection attacks, length violations)
app.use(inputValidationMiddleware);

// 8. Rate limiting
app.use('/api/', globalLimiter); // Apply global rate limiting to API routes

// 9. Quota middleware (check quotas before processing requests)
app.use('/api/', quotaMiddleware); // Check quotas for quota-limited endpoints
app.use('/api/', quotaInfoMiddleware); // Add quota info to response headers

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Metrics endpoint (Prometheus format)
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metricsRegistry.contentType);
    const metrics = await metricsRegistry.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
});

// Swagger/OpenAPI Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// OpenAPI JSON endpoint
app.get('/api/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes with rate limiting
app.use('/api/v1/auth', authLimiter, authRoutes); // Stricter auth rate limit
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/platforms', platformRoutes);
app.use('/api/v1/earnings', earningRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/goals', goalRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/metrics', metricsRoutes); // Performance metrics collection (no auth required)
app.use('/api/v1/upload', uploadLimiter, uploadRoutes); // Stricter upload rate limit
app.use('/api/v1/export', exportRoutes); // Data export and backup routes
app.use('/api/v1/jobs', jobsRoutes); // Job scheduler routes (admin only)
app.use('/api/v1', quotaRoutes); // Quota management routes

// Error handling
app.use(notFound);
app.use(errorHandler);

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Initialize WebSocket
const io = initializeWebSocket(server, corsOptions);

// Register WebSocket authentication middleware
io.use(wsAuthMiddleware);

// Setup WebSocket event handlers
io.on('connection', (socket) => {
  const userId = socket.handshake.auth?.userId;
  logDebug('User connected via WebSocket', {
    socketId: socket.id,
    userId,
  });

  // Setup earnings events
  setupEarningsEvents(socket);

  // Setup notification events
  setupNotificationEvents(socket);
});

// Initialize Redis (optional, gracefully handles if unavailable)
initializeRedisClient().catch((error) => {
  logError('Failed to initialize Redis client', error);
  // Continue without Redis - caching will be disabled
});

// Initialize Job Scheduler
scheduler.initialize().catch((error) => {
  logError('Failed to initialize job scheduler', error);
  // Continue without job scheduler
});

// Start server
server.listen(PORT, () => {
  logInfo('Server started successfully', {
    port: PORT,
    environment: NODE_ENV,
    nodeVersion: process.version,
    websocket: 'enabled',
    caching: process.env.REDIS_ENABLED !== 'false' ? 'enabled' : 'disabled',
    jobScheduler: process.env.ENABLE_JOBS === 'true' ? 'enabled' : 'disabled',
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logInfo(`Graceful shutdown initiated by ${signal}`);

  // Close WebSocket connections
  io.close();

  // Stop job scheduler
  await scheduler.stop().catch((error) => {
    logError('Error stopping job scheduler', error);
  });

  // Disconnect Redis
  await disconnectRedis().catch((error) => {
    logError('Error disconnecting Redis', error);
  });

  server.close(() => {
    logInfo('Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logError('Forced shutdown - graceful shutdown timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError('Uncaught exception', error, {
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled rejection', reason as Error, {
    promise: promise.toString(),
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
});

export default app;
