// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cron = require('node-cron');
require('dotenv').config();

const { initializeDatabase } = require('./config/database');
const reportRoutes = require('./routes/reports');
const submissionRoutes = require('./routes/submissions');
const rateLimiter = require('./middleware/rateLimiter');
const newsAggregator = require('./services/newsAggregator');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/reports', reportRoutes);
app.use('/api/submissions', submissionRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('subscribe:feed', (feedType) => {
    if (['hero', 'corruption'].includes(feedType)) {
      socket.join(feedType);
      logger.info(`Socket ${socket.id} subscribed to ${feedType} feed`);
    }
  });

  socket.on('unsubscribe:feed', (feedType) => {
    socket.leave(feedType);
  });

  socket.on('new:report', async (data) => {
    try {
      io.to(data.type).emit('update:feed', data);
      logger.info(`New ${data.type} report broadcasted`);
    } catch (error) {
      logger.error('Error broadcasting report:', error);
    }
  });

  socket.on('appreciate:report', async (reportId) => {
    try {
      io.emit('appreciation:update', { reportId, timestamp: new Date() });
    } catch (error) {
      logger.error('Error handling appreciation:', error);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// Scheduled news aggregation every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  logger.info('Running scheduled news aggregation...');
  try {
    const newReports = await newsAggregator.fetchAndProcess();
    newReports.forEach(report => {
      io.to(report.type).emit('update:feed', report);
    });
    logger.info(`Aggregated ${newReports.length} new reports`);
  } catch (error) {
    logger.error('News aggregation error:', error);
  }
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initializeDatabase();
    logger.info('Database initialized successfully');
    
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`✅ WebSocket enabled`);
      logger.info(`✅ News aggregation scheduled`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
