require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const securityMiddleware = require('./middleware/security');
const expressRateLimit = require('express-rate-limit');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { createProxyMiddleware } = require('http-proxy-middleware');

// IMPORTANT: Import necessary modules for the new route and error handling
const { authenticate, authorize, optionalAuthenticate } = require('./middleware/authMiddleware');
// Removed: const uploadMiddleware = require('./middleware/uploadMiddleware'); // Removed as requested
// Removed: const complaintController = require('./controllers/complaintController'); // Removed as requested
const ErrorResponse = require('./utils/ErrorResponse'); // Still needed for error handling
const Complaint = require('./models/Complaint'); // Still needed for creating Complaint documents


const app = express();

// Log environment variables at startup
console.log('--- NODE.JS ENVIRONMENT VARIABLES ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET (from .env):', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('JWT_EXPIRES_IN (from .env):', process.env.JWT_EXPIRES_IN);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI (from .env):', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('PYTHON_ML_SERVICE_URL (from .env):', process.env.PYTHON_ML_SERVICE_URL || 'Not Set (using default)');
console.log('-----------------------------------');

connectDB();

securityMiddleware(app);

// CORS configuration for the frontend server
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8000',
  credentials: true,
}));

// Content Security Policy (CSP) configuration
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; ` +
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; ` +
    `style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com; ` +
    `img-src 'self' data: ${process.env.PYTHON_ML_SERVICE_URL || 'http://localhost:8001'} https://*.tile.openstreetmap.org; ` +
    `connect-src 'self' ${process.env.PYTHON_ML_SERVICE_URL || 'http://localhost:8001'} https://*.tile.openstreetmap.org; ` +
    `font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com; ` +
    `object-src 'none'; ` +
    `base-uri 'self';`
  );
  next();
});

app.use(morgan('dev'));

app.use(express.json({ limit: '10kb' })); // Essential for parsing JSON body from frontend
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded bodies
app.use(cookieParser());

// --- IMPORTANT: SERVE STATIC FILES BEFORE API ROUTES ---
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // This line is for serving existing uploads, not for processing new ones
// --- END STATIC FILE SERVING ---

// --- NEW ROUTE TO HANDLE POST /complaints DIRECTLY (from frontend's api.js) ---
// Logic for creating complaint is now directly in this route handler.
app.post(
  '/complaints',
  optionalAuthenticate, // Allows both logged-in and anonymous submissions
  async (req, res, next) => {
    try {
      // Data is expected to be JSON from frontend now, parsed by express.json()
      const { title, description, category, locationText, department } = req.body;

      // Validate required fields
      if (!title || !description || !category || !locationText) {
        return next(new ErrorResponse('All required fields (title, description, category, location) must be filled', 400));
      }

      // No file handling as uploadMiddleware is removed
      const evidenceImages = [];
      const evidenceVideos = [];
      const evidenceDocuments = [];

      // Create location object
      const location = {
          type: 'Point',
          coordinates: [0, 0], // Default coordinates
          address: locationText
      };

      // Try to parse coordinates if provided
      if (locationText.includes(',')) {
          const coords = locationText.split(',').map(Number);
          if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
              location.coordinates = [coords[1], coords[0]]; // [lng, lat]
          }
      }

      // Determine user for the complaint
      const userId = req.user ? req.user.id : undefined;
      const isAnonymous = !userId; // If no user ID, it's anonymous

      const newComplaint = await Complaint.create({
          user: userId,
          title,
          description,
          category,
          location,
          evidenceImages, // Will be empty
          evidenceVideos, // Will be empty
          evidenceDocuments, // Will be empty
          isAnonymous: isAnonymous,
          // department: department // Uncomment if you want to save department, ensure it's a valid ObjectId if referenced
      });

      res.status(201).json({
          success: true,
          message: 'Complaint submitted successfully!',
          data: newComplaint
      });

    } catch (err) {
      console.error('Error in /complaints route handler:', err);
      if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        return next(new ErrorResponse(`Complaint validation failed: ${messages.join(', ')}`, 400));
      }
      next(new ErrorResponse('Failed to submit complaint due to an internal server error.', 500));
    }
  }
);
// --- END NEW COMPLAINT ROUTE ---

// --- PROXY FOR PYTHON ML SERVICE ---
const pythonMlProxy = createProxyMiddleware({
    target: process.env.PYTHON_ML_SERVICE_URL || 'http://localhost:8001',
    changeOrigin: true,
    pathRewrite: {
        '^/api/ml': '/api/ml',
    },
    onProxyReq: (proxyReq, req, res) => {
        // console.log(`Proxying request to Python: ${proxyReq.path}`);
    },
    onError: (err, req, res) => {
        console.error('Proxy error to Python ML service:', err);
        res.status(500).json({ success: false, message: 'Failed to connect to ML service.' });
    }
});
app.use('/api/ml', pythonMlProxy);
// --- END PROXY ---


// --- NEW ROUTE: RESET STAFF PASSWORDS ---
app.post('/api/admin/reset-staff-passwords', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const newPassword = 'StaffPassword123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await mongoose.model('User').updateMany(
      { role: 'staff' },
      { $set: { password: hashedPassword } }
    );
    console.log('Password reset result:', result);
    res.status(200).json({
      success: true,
      message: `Successfully reset passwords for ${result.modifiedCount} staff members`,
      data: { modifiedCount: result.modifiedCount, matchedCount: result.matchedCount }
    });
  } catch (err) {
    console.error('Error resetting staff passwords:', err);
    next(new ErrorResponse(`Error resetting staff passwords: ${err.message}`, 500));
  }
});
// --- END NEW ROUTE ---

// --- ROUTE MOUNTING ---
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const publicAuthRoutes = require('./routes/publicAuthRoutes');
const staffRoutes = require('./routes/staffRoutes');

app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/complaints', complaintRoutes); // This mounts your existing complaint routes under /api/complaints
app.use('/api', publicAuthRoutes);
app.use('/api/staff', staffRoutes);
// --- END ROUTE MOUNTING ---

// --- ERROR HANDLING MIDDLEWARE ---
app.use(notFound);
app.use(errorHandler);
// --- END ERROR HANDLING ---

exports.authLimiter = expressRateLimit({
  windowMs: 2 * 60 * 60 * 1000,
  max: 1000,
  message: 'Too many login attempts, please try again later'
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
