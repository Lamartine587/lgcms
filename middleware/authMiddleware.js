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

/**
 * Middleware to optionally authenticate a user.
 * If a valid JWT is present, it attaches user data to req.user.
 * If no token or an invalid token, it proceeds without error, leaving req.user undefined.
 */
exports.optionalAuthenticate = async (req, res, next) => {
    console.log('[OptionalAuthMiddleware] START: Checking for token...');
    let token;
    // Get token from header or cookie
    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
        console.log('[OptionalAuthMiddleware] Token found in headers (partial):', token ? token.substring(0, 10) + '...' : 'None');
    } else if (req.cookies.token) {
        token = req.cookies.token;
        console.log('[OptionalAuthMiddleware] Token found in cookies (partial):', token ? token.substring(0, 10) + '...' : 'None');
    }

    if (!token) {
        // No token provided, proceed without attaching user
        console.log('[OptionalAuthMiddleware] No token found. Proceeding anonymously.');
        return next();
    }

    try {
        // Check if token is blacklisted (even for optional auth, if it's blacklisted, it's invalid)
        const isBlacklisted = await BlacklistedToken.exists({ token });
        if (isBlacklisted) {
            console.warn('[OptionalAuthMiddleware] Token found but is blacklisted, proceeding anonymously.');
            return next(); // Token is blacklisted, proceed without user
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id); // Fetch user data

        if (!req.user) {
            console.warn('[OptionalAuthMiddleware] User not found for token, proceeding anonymously.');
            return next(); // User not found, proceed without user
        }
        
        // Optionally add token expiration info if needed for optional auth
        req.tokenExpiresAt = new Date(decoded.exp * 1000);
        console.log('[OptionalAuthMiddleware] Token valid. User authenticated:', req.user.id, 'Role:', req.user.role);
        next(); // Proceed with user attached
    } catch (error) {
        // Token is invalid or expired, but we still proceed for optional auth
        console.warn('[OptionalAuthMiddleware] Token invalid or expired, proceeding anonymously:', error.message);
        next(); // Proceed without user attached
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
  max: 1000, // limit each IP to 10 requests per windowMs
  message: 'Too many login attempts, please try again later'
});
