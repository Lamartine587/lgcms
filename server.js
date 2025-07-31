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

// IMPORTANT: Removed uploadMiddleware and complaintController imports as requested.
// This will cause the app.post('/complaints') route (if uncommented) to fail.
const { authenticate, authorize, optionalAuthenticate } = require('./middleware/authMiddleware');


const app = express();

// Log environment variables at startup
console.log('--- NODE.JS ENVIRONMENT VARIABLES ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('JWT_SECRET (from .env):', process.env.JWT_SECRET);
console.log('JWT_EXPIRES_IN (from .env):', process.env.JWT_EXPIRES_IN);
console.log('PORT:', process.env.PORT);
console.log('-----------------------------------');

connectDB();

securityMiddleware(app);

// CORS configuration for the frontend server
app.use(cors({
  origin: 'http://localhost:5000', // Ensure this matches your frontend's origin
  credentials: true,
}));

// Content Security Policy (CSP) configuration
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; " +
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com; " +
    "img-src 'self' data: http://localhost:5001 https://*.tile.openstreetmap.org; " +
    "connect-src 'self' http://localhost:5001 https://*.tile.openstreetmap.org; " +
    "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com; " +
    "object-src 'none'; " +
    "base-uri 'self';"
  );
  next();
});

app.use(morgan('dev'));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- IMPORTANT: SERVE STATIC FILES BEFORE API ROUTES ---
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// --- END STATIC FILE SERVING ---

// --- NEW ROUTE TO HANDLE POST /complaints DIRECTLY (REMOVED DEPENDENCIES) ---
// This route will now likely fail or not handle file uploads/complaint logic correctly
// because uploadMiddleware and complaintController are no longer imported.
// If you uncomment this, you will need to re-add the necessary imports and logic.
/*
app.post(
  '/complaints',
  // uploadMiddleware.fields([...]), // This would be undefined
  optionalAuthenticate,
  // complaintController.createComplaint // This would be undefined
);
*/
// --- END NEW COMPLAINT ROUTE ---


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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
