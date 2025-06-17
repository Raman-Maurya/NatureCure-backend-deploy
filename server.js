import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Import configurations and routes
import connectDB from './config/database.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

// Import routes
import remedyRoutes from './routes/remedyRoutes.js';
import userRoutes from './routes/userRoutes.js';
import herbRoutes from './routes/herbRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Connect to MongoDB
connectDB();

// Trust proxy
app.set('trust proxy', 1);

// Rate limiting - hardcoded values
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all requests
app.use(limiter);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration with hardcoded values
app.use(cors({
  origin: ['http://localhost:5173', 'https://naturecure.netlify.app', 'https://herbheal.netlify.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*', // Allow all headers
  credentials: false, // Don't require credentials
  optionsSuccessStatus: 200,
  maxAge: 3600,
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

// Compression middleware
app.use(compression());

// Logging middleware - hardcoded to 'dev' mode
app.use(morgan('dev'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'HerbHeal API Server is running! 🌿',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/remedies', remedyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/herbs', herbRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server with hardcoded port
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`🌿 HerbHeal API Server running on port ${PORT}`);
  console.log(`📍 Environment: development`);
  console.log(`🔗 CORS enabled for: http://localhost:5173, https://naturecure.netlify.app, https://herbheal.netlify.app`);
});

export default app; 