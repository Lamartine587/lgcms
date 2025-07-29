const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/ErrorResponse');
const User = require('../models/User');
const BlacklistedToken = require('../models/BlacklistedToken');

// Protect routes
exports.authenticate = async (req, res, next) => {
  console.log(`Auth attempt: ${req.method} ${req.originalUrl}`);
  
  let token;

  // Get token from header or cookie
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Check if token is blacklisted
    const isBlacklisted = await BlacklistedToken.exists({ token });
    if (isBlacklisted) {
      return next(new ErrorResponse('Token is no longer valid', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    
    if (!req.user) {
      return next(new ErrorResponse('User no longer exists', 401));
    }

    // Add token expiration info
    req.tokenExpiresAt = new Date(decoded.exp * 1000);
    if (req.tokenExpiresAt < new Date(Date.now() + 86400000)) {
      req.shouldRefreshToken = true;
    }

    next();
  } catch (err) {
    let message = 'Not authorized to access this route';
    if (err.name === 'TokenExpiredError') {
      message = 'Session expired, please login again';
    } else if (err.name === 'JsonWebTokenError') {
      message = 'Invalid token';
    }
    return next(new ErrorResponse(message, 401));
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Not authenticated', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

// Optional: Add rate limiting for auth routes
exports.authLimiter = require('express-rate-limit')({
  windowMs: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  max: 100, // limit each IP to 10 requests per windowMs
  message: 'Too many login attempts, please try again later'
});