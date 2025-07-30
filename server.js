require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const securityMiddleware = require('./middleware/security');
const expressRateLimit = require('express-rate-limit');

const app = express();

connectDB();

securityMiddleware(app);

// Add Content Security Policy header
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " + // 'unsafe-inline' and 'unsafe-eval' might be needed for some dev tools or older libraries, consider removing in production
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css; " + // ALLOW STYLESHEETS FROM FONT AWESOME CDN AND GOOGLE FONTS
    "img-src 'self' data: http://localhost:5001; " + // Allow images from self and your ML backend
    "connect-src 'self' http://localhost:5001; " + // ALLOW CONNECTION TO YOUR PYTHON ML BACKEND
    "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com ; " + // Allow fonts from Font Awesome CDN and Google Fonts
    "object-src 'none'; " +
    "base-uri 'self';"
  );
  next();
});

app.use(morgan('dev'));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// IMPORTANT: Serve the 'uploads' directory for evidence files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount your API routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes')); // Ensure this line is present

app.use(notFound);
app.use(errorHandler);

exports.authLimiter = expressRateLimit({
  windowMs: 2 * 60 * 60 * 1000,
  max: 1000,
  message: 'Too many login attempts, please try again later'
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
