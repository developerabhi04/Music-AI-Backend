// ✅ CRITICAL: Load environment variables FIRST before any other imports
import dotenv from 'dotenv';

dotenv.config({
  path: "./Config/.env",
});


// ✅ Debug environment variables loading
console.log('🔍 Environment Variables Status:');
console.log('SUNO_API_KEY:', process.env.SUNO_API_KEY ? '✅ Found' : '❌ Missing');
console.log('MONGO_URL:', process.env.MONGO_URL ? '✅ Found' : '❌ Missing');
console.log('BACKEND_URL:', process.env.BACKEND_URL);



import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import database connection
import { connectDB } from './Config/Db.js';

// Import routes
import authRoutes from './Routes/Auth.js';
import musicRoutes from './Routes/Music.js';
import lyricsRoutes from './Routes/Lyrics.js';
import audioRoutes from './Routes/Audio.js';
import videoRoutes from './Routes/Video.js';
import accountRoutes from './Routes/Account.js';
import workspaceRoutes from './Routes/Workspaces.js';
import webhookRoutes from './Routes/webhookRoutes.js';

// Get current directory (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express application
const app = express();
const server = http.createServer(app);


// ✅ Create necessary directories for file storage
const createDirectories = () => {
  const dirs = [
    path.join(__dirname, 'public'),
    path.join(__dirname, 'public/generated-music'),
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads/audio'),
    path.join(__dirname, 'uploads/temp')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
};

createDirectories();


// Trust proxy for production deployments
app.set('trust proxy', 1);


// ✅ IMPORTANT: Add static file serving BEFORE other middleware
app.use('/generated-music', express.static(path.join(__dirname, 'public/generated-music'), {
  maxAge: '1h',
  setHeaders: (res, path) => {
    if (path.endsWith('.mp3') || path.endsWith('.wav')) {
      res.set('Content-Type', 'audio/mpeg');
      res.set('Accept-Ranges', 'bytes');
    }
  }
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1h'
}));

app.use('/public', express.static(path.join(__dirname, 'public')));

// Test endpoint for static file serving
app.get('/test-audio', (req, res) => {
  res.json({
    success: true,
    message: 'Audio endpoints available',
    endpoints: [
      `${process.env.BACKEND_URL}/generated-music/filename.mp3`,
      `${process.env.BACKEND_URL}/uploads/filename.mp3`
    ],
    directories: {
      'generated-music': fs.existsSync(path.join(__dirname, 'public/generated-music')),
      'uploads': fs.existsSync(path.join(__dirname, 'uploads'))
    }
  });
});


// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "data:"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000',
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Environment variables
const PORT = process.env.PORT || 5000;
const MONGODB = process.env.MONGO_URL;

// Connect to MongoDB
try {
  await connectDB(MONGODB);
  console.log('✅ Database connected successfully');
} catch (error) {
  console.error('❌ Database connection failed:', error);
  process.exit(1);
}

// Rate limiting
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: {
    success: false,
    message,
    retryAfter: Math.ceil(windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/health' ||
      req.path === '/api' ||
      req.path.includes('/callback') ||
      req.path.includes('/webhooks');
  }
});

// Apply rate limits
app.use('/api/auth/login', createRateLimit(15 * 60 * 1000, 5, 'Too many login attempts'));
app.use('/api/auth/register', createRateLimit(15 * 60 * 1000, 3, 'Too many registration attempts'));
app.use('/api/', createRateLimit(15 * 60 * 1000, 100, 'Too many API requests'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  if (!req.url.includes('/health') && !req.url.includes('/favicon')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${req.ip}`);
  }
  next();
});


// Add this route (before other routes)
app.use('/api/webhooks', webhookRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/lyrics', lyricsRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/workspaces', workspaceRoutes);


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    staticDirectories: {
      'generated-music': fs.existsSync(path.join(__dirname, 'public/generated-music')),
      'uploads': fs.existsSync(path.join(__dirname, 'uploads'))
    }
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Music AI API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      music: '/api/music',
      lyrics: '/api/lyrics',
      audio: '/api/audio',
      video: '/api/video',
      account: '/api/account',
      workspaces: '/api/workspaces',
      webhooks: '/api/webhooks'
    },
    staticPaths: {
      'generated-music': '/generated-music',
      'uploads': '/uploads'
    }
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Enhanced error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Global error handler:', error);

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors,
      type: 'ValidationError'
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
      type: 'DuplicateKeyError'
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
      type: 'JWTError'
    });
  }

  // CORS error
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      type: 'CORSError'
    });
  }

  // Default error response
  const statusCode = error.status || error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    type: error.name || 'UnknownError',
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack
    })
  });
});


// 404 handler
// 404 handler - Express 5.x compatible
app.use('/*splat', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    availableRoutes: {
      health: 'GET /health',
      api: 'GET /api',
      auth: 'POST /api/auth/*',
      music: 'POST /api/music/*',
      lyrics: 'POST /api/lyrics/*',
      audio: 'POST /api/audio/*',
      video: 'POST /api/video/*',
      account: 'GET /api/account/*',
      workspaces: 'GET /api/workspaces/*'
    }
  });
});




// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  try {
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    await mongoose.connection.close();
    console.log('✅ Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
server.listen(PORT, () => {
  console.log('\n🚀 ===============================================');
  console.log(`🎵 Music AI API Server Started Successfully!`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Server: http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`📚 API Info: http://localhost:${PORT}/api`);
  console.log(`🗄️  Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('🚀 ===============================================\n');
});

export default app;
