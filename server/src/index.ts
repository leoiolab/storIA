import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import characterRoutes from './routes/characters';
import chapterRoutes from './routes/chapters';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const rawOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set(rawOrigins);
const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS !== 'false';

const isAllowedOrigin = (origin?: string | null) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has(origin)) {
    return true;
  }

  if (allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) {
    return true;
  }

  return false;
};

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware to fix relationships field if it's a string
// This MUST run after express.json() but before routes
app.use((req: Request, res: Response, next: NextFunction) => {
  // Only process PUT/POST requests with body
  if (req.method === 'PUT' || req.method === 'POST') {
    if (req.body && req.body.relationships && typeof req.body.relationships === 'string') {
      try {
        let toParse = req.body.relationships.trim();
        console.log('=== MIDDLEWARE: Fixing relationships string ===');
        console.log('Middleware: Original string (first 300 chars):', toParse.substring(0, 300));
        
        // Handle JavaScript code format first (has string concatenation like "[\n' + '  {\n' +")
        if (toParse.includes("' +") || toParse.includes('" +') || toParse.includes("\\n") || toParse.includes('\n')) {
          console.log('Middleware: Detected JavaScript code format with concatenation');
          // Remove all string concatenation operators
          toParse = toParse
            .replace(/' \+/g, '')
            .replace(/" \+/g, '')
            .replace(/\s*\+\s*/g, '') // Remove any remaining + operators with whitespace
            .replace(/\\n/g, '') // Remove escaped newlines
            .replace(/\n/g, '') // Remove actual newlines
            .replace(/\r/g, '') // Remove carriage returns
            .trim();
          
          // Extract array part
          const arrayStart = toParse.indexOf('[');
          const arrayEnd = toParse.lastIndexOf(']');
          if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
            toParse = toParse.substring(arrayStart, arrayEnd + 1);
          }
          
          // Convert single quotes to double quotes
          toParse = toParse.replace(/'/g, '"');
          console.log('Middleware: After cleaning (first 200 chars):', toParse.substring(0, 200));
        } else if (toParse.includes("'")) {
          // Handle single quotes (convert to double quotes)
          console.log('Middleware: Detected single quotes, converting to double quotes');
          toParse = toParse.replace(/'/g, '"');
        }
        
        // Try to parse
        if (toParse.startsWith('[') && toParse.endsWith(']')) {
          const parsed = JSON.parse(toParse);
          if (Array.isArray(parsed)) {
            req.body.relationships = parsed;
            console.log('Middleware: ✅ Successfully fixed relationships from string to array, got', parsed.length, 'items');
            console.log('Middleware: Sample item:', JSON.stringify(parsed[0]));
          } else {
            console.error('Middleware: ❌ Parsed result is not an array:', typeof parsed, parsed);
          }
        } else {
          console.error('Middleware: ❌ String does not look like an array after cleaning');
          console.error('Middleware: Cleaned string (first 200 chars):', toParse.substring(0, 200));
        }
      } catch (e: any) {
        console.error('Middleware: ❌ Failed to parse relationships:', e?.message);
        console.error('Middleware: Error stack:', e?.stack);
      }
    } else if (req.body && req.body.relationships) {
      console.log('Middleware: relationships is not a string, type:', typeof req.body.relationships, 'isArray:', Array.isArray(req.body.relationships));
    }
  }
  next();
});

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/chapters', chapterRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/storia';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    console.log(`📦 Database: ${mongoose.connection.name}`);
    
    app.listen(PORT, () => {
      console.log(`🚀 StorIA Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 CORS enabled for: ${Array.from(allowedOrigins).join(', ') || 'none (public)'}`);
      if (allowVercelPreviews) {
        console.log('🌐 Vercel preview domains (*.vercel.app) are allowed');
      }
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});


