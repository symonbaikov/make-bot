import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { requestLogger } from './middleware/request-logger';
import { apiLimiter } from './middleware/rate-limiter';
import { errorHandler } from './middleware/error-handler';
import { sendError } from './utils/response';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
import webhookRoutes from './routes/webhook-routes';
import adminRoutes from './routes/admin-routes';

app.use('/api/webhook', webhookRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  sendError(res, 'Not found', 'NOT_FOUND', 404);
});

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

