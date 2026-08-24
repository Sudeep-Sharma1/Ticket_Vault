import express from 'express';
import http from 'http';
import cors from 'cors';
import { ENV } from './config/env';
import { prisma } from './config/prisma';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { initSocketService } from './services/socketService';
import { startTtlExpiryJob } from './jobs/ttlExpiryJob';

const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.io
initSocketService(httpServer);

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
if (ENV.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: ENV.NODE_ENV,
  });
});

// API Routes
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);

// Start Background TTL Job
startTtlExpiryJob(3000); // Check every 3 seconds for rapid responsive auto-release

// Start Server
httpServer.listen(ENV.PORT, async () => {
  console.log(`
🚀 ===================================================
🎫 Ticket Booking Platform Backend is Running!
📡 Port: ${ENV.PORT}
🌐 API Root: http://localhost:${ENV.PORT}/api
⚡ WebSocket: ws://localhost:${ENV.PORT}
🔒 Hold TTL: ${ENV.HOLD_TTL_MINUTES} minutes
⏳ Waitlist Offer TTL: ${ENV.WAITLIST_OFFER_TTL_MINUTES} minutes
===================================================
  `);
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server and database connections.');
  await prisma.$disconnect();
  httpServer.close(() => {
    console.log('HTTP server closed.');
  });
});
