import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// @desc    Health check endpoint
// @route   GET /api/health
// @access  Public
router.get('/', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    }
  };

  res.status(200).json({
    success: true,
    data: healthData
  });
});

// @desc    Detailed health check
// @route   GET /api/health/detailed
// @access  Public
router.get('/detailed', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy';
    
    // Check if we can perform a simple database operation
    let dbOperational = false;
    try {
      await mongoose.connection.db.admin().ping();
      dbOperational = true;
    } catch (error) {
      console.error('Database ping failed:', error);
    }

    const healthData = {
      status: dbStatus === 'healthy' && dbOperational ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: {
          status: dbStatus,
          operational: dbOperational,
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          name: mongoose.connection.name
        },
        ai: {
          provider: 'Perplexity',
          model: 'llama-3.1-sonar-large-128k-online',
          status: process.env.PERPLEXITY_API_KEY ? 'configured' : 'not configured'
        },
        fileUpload: {
          status: 'active',
          maxSize: process.env.MAX_FILE_SIZE || '10MB',
          allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        }
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
          external: Math.round(process.memoryUsage().external / 1024 / 1024) + ' MB',
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB'
        },
        cpu: process.cpuUsage(),
        pid: process.pid
      }
    };

    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: healthData.status === 'healthy',
      data: healthData
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    });
  }
});

// @desc    Readiness probe (for Kubernetes/Docker)
// @route   GET /api/health/ready
// @access  Public
router.get('/ready', async (req, res) => {
  try {
    // Check if database is ready
    const dbReady = mongoose.connection.readyState === 1;
    
    if (dbReady) {
      // Try a simple database operation
      await mongoose.connection.db.admin().ping();
      
      res.status(200).json({
        success: true,
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'not ready',
        reason: 'Database not connected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'not ready',
      reason: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    Liveness probe (for Kubernetes/Docker)
// @route   GET /api/health/live
// @access  Public
router.get('/live', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router; 