import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import swaggerUi from 'swagger-ui-express';
import logger, { logInfo, logDebug, logError } from './lib/logger';
import { swaggerSpec } from './lib/swagger';

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

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { notFound } from './middleware/notFound.middleware';
import loggingMiddleware from './middleware/logging.middleware';
import securityHeadersMiddleware from './middleware/security-headers.middleware';
import {
  globalLimiter,
  authLimiter,
  uploadLimiter,
} from './middleware/rate-limit.middleware';

// Import WebSocket
import { initializeWebSocket } from './websocket/ws';
import { wsAuthMiddleware } from './middleware/ws-auth.middleware';
import { setupEarningsEvents } from './websocket/events/earnings.events';
import { setupNotificationEvents } from './websocket/events/notifications.events';

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Security middleware (applied first, before any other middleware)
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

// Middleware (in order: CORS → body parsing → logging → global rate limit)
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Limit payload size (supports file uploads)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(loggingMiddleware); // Request/Response logging
app.use('/api/', globalLimiter); // Apply global rate limiting to API routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
app.use('/api/v1/upload', uploadLimiter, uploadRoutes); // Stricter upload rate limit

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

// Start server
server.listen(PORT, () => {
  logInfo('Server started successfully', {
    port: PORT,
    environment: NODE_ENV,
    nodeVersion: process.version,
    websocket: 'enabled',
  });
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logInfo(`Graceful shutdown initiated by ${signal}`);

  // Close WebSocket connections
  io.close();

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
