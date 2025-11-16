import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import helmet from 'helmet';
import { logger } from './utils/logger';
import {
  initSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  sentryUserContextMiddleware,
} from './lib/sentry';
import { initSwagger } from './lib/swagger';
import { createApolloServer } from './graphql/server';
import { graphqlDocsHandler } from './graphql/docs';

// Load environment variables first
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import twoFactorRoutes from './routes/2fa.routes';
import webauthnRoutes from './routes/webauthn.routes';
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
import webhookRoutes from './routes/webhook.routes';
import chatbotRoutes from './routes/chatbot.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import smsRoutes from './routes/sms.routes';
import fileRoutes, { folderRouter } from './routes/file.routes';
import reportRoutes from './routes/report.routes';
import workflowRoutes from './routes/workflow.routes';
import emailRoutes from './routes/email.routes';
import biRoutes from './routes/bi.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { notFound } from './middleware/notFound.middleware';

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Initialize Sentry early (before any other middleware)
initSentry(app);

// Sentry request handler must be the first middleware
app.use(sentryRequestHandler());

// Sentry tracing handler
app.use(sentryTracingHandler());

// Security: Use Helmet.js for security headers
if (process.env.HELMET_ENABLED !== 'false') {
  app.use(helmet({
    contentSecurityPolicy: IS_PRODUCTION,
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }));
}

// Compression: Compress responses
if (process.env.COMPRESSION_ENABLED !== 'false') {
  app.use(compression({
    level: IS_PRODUCTION ? 9 : 6,
    threshold: 1024,
  }));
}

// Legacy security headers (fallback)
app.use((req, res, next) => {
  // Prevent XSS attacks
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Prevent clickjacking
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HTTPS enforcement
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

// Rate limiting (more restrictive in production)
const limiter = rateLimit({
  windowMs: IS_PRODUCTION ? 15 * 60 * 1000 : parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: IS_PRODUCTION ? 50 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

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

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use('/api/', limiter);

// Set Sentry user context after authentication (applies to all routes)
app.use(sentryUserContextMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Swagger UI
initSwagger(app);

// Initialize GraphQL Apollo Server
const apolloServer = createApolloServer();
apolloServer.start().then(() => {
  apolloServer.applyMiddleware({
    app,
    path: '/api/graphql',
    cors: false, // Use existing CORS configuration
  });
  logger.info('GraphQL server started', {
    path: '/api/graphql',
    introspection: NODE_ENV === 'development',
  });
});

// GraphQL API Documentation
app.get('/api/graphql/docs', graphqlDocsHandler);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth/2fa', twoFactorRoutes);
app.use('/api/v1/auth/webauthn', webauthnRoutes);
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
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/chatbot', chatbotRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);
app.use('/api/v1/sms', smsRoutes);
app.use('/api/v1/files', fileRoutes);
app.use('/api/v1/folders', folderRouter);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/v1/emails', emailRoutes);
app.use('/api/v1/bi', biRoutes);

// Sentry error handler must be before other error handlers
app.use(sentryErrorHandler());

// Error handling
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: NODE_ENV,
  });
});

export default app;
