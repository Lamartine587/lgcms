const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // 1. Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            
            // Debugging: Log the received token
            console.log('Received token:', token);
            
            if (!token) {
                return res.status(401).json({ 
                    success: false,
                    message: 'Not authorized, no token provided' 
                });
            }

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user from database
            req.user = await User.findById(decoded.id).select('-password');
            
            if (!req.user) {
                return res.status(401).json({ 
                    success: false,
                    message: 'User not found' 
                });
            }
            
            next();
        } catch (error) {
            console.error('JWT Error:', error.message);
            
            let message = 'Not authorized, token failed';
            if (error.name === 'TokenExpiredError') {
                message = 'Token expired';
            } else if (error.name === 'JsonWebTokenError') {
                message = 'Invalid token';
            }
            
            return res.status(401).json({ 
                success: false,
                message 
            });
        }
    } else {
        return res.status(401).json({ 
            success: false,
            message: 'Not authorized, no token' 
        });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false,
                message: `User role ${req.user?.role} is not authorized to access this route` 
            });
        }
        next();
    };
};

module.exports = { protect, authorizeRoles };