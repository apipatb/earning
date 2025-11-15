import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import platformRoutes from './routes/platform.routes';
import earningRoutes from './routes/earning.routes';
import analyticsRoutes from './routes/analytics.routes';
import goalRoutes from './routes/goal.routes';
import paymentRoutes from './routes/payment.routes';
import emailRoutes from './routes/email.routes';
import affiliateRoutes from './routes/affiliate.routes';
import apiManagementRoutes from './routes/api-management.routes';
import reportRoutes from './routes/report.routes';
import integrationRoutes from './routes/integration.routes';
import teamRoutes from './routes/team.routes';
import aiRoutes from './routes/ai.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import socialRoutes from './routes/social.routes';
import securityRoutes from './routes/security.routes';
import schedulerRoutes from './routes/scheduler.routes';
import notificationRoutes from './routes/notification.routes';
import analyticsAdvancedRoutes from './routes/analytics-advanced.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { notFound } from './middleware/notFound.middleware';
import { attachSubscription } from './middleware/tier.middleware';
import { auth } from './middleware/auth.middleware';

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);

// Attach subscription info to authenticated requests
app.use(auth, attachSubscription);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/platforms', platformRoutes);
app.use('/api/v1/earnings', earningRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/goals', goalRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/emails', emailRoutes);
app.use('/api/v1/affiliate', affiliateRoutes);
app.use('/api/v1/api-management', apiManagementRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/integrations', integrationRoutes);
app.use('/api/v1/team', teamRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/marketplace', marketplaceRoutes);
app.use('/api/v1/social', socialRoutes);
app.use('/api/v1/security', securityRoutes);
app.use('/api/v1/scheduler', schedulerRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics-advanced', analyticsAdvancedRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

export default app;
