const express = require('express');
const router = express.Router();
const User = require('../models/User');
// Assuming you have a Complaint model. Uncomment this line if you have it.
// const Complaint = require('../models/Complaint'); 
const { validateUserRegistration, validateLogin } = require('../utils/validation');
const { generateToken } = require('../utils/auth');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const ErrorResponse = require('../utils/ErrorResponse');

// @desc    Register a user
// @route   POST /api/users/register
// @access  Public
router.post('/register', validateUserRegistration, async (req, res, next) => {
  try {
    const { fullName, username, email, password, role = 'citizen' } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new ErrorResponse('User already exists', 400));
    }

    const user = await User.create({ fullName, username, email, password, role });
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
router.get('/me', authenticate, authorize('citizen'), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Get citizen dashboard statistics
// @route   GET /api/users/dashboard-stats
// @access  Private (Citizen)
router.get('/dashboard-stats', authenticate, authorize('citizen'), async (req, res, next) => {
    try {
        const userId = req.user.id; // Get the logged-in user's ID

        // Placeholder for actual data fetching:
        // You would query your Complaint model here to get user-specific stats
        let totalComplaints = 0;
        let pendingComplaints = 0;
        let resolvedComplaints = 0;
        let recentComplaints = [];

        // Example: If Complaint model exists and is imported
        if (typeof Complaint !== 'undefined') {
            totalComplaints = await Complaint.countDocuments({ user: userId });
            pendingComplaints = await Complaint.countDocuments({ user: userId, status: 'Pending' });
            resolvedComplaints = await Complaint.countDocuments({ user: userId, status: 'Resolved' });
            
            recentComplaints = await Complaint.find({ user: userId })
                                            .sort({ createdAt: -1 })
                                            .limit(5)
                                            .select('title status createdAt');
        } else {
            // Dummy data if Complaint model is not available for testing
            totalComplaints = 10;
            pendingComplaints = 3;
            resolvedComplaints = 7;
            recentComplaints = [
                { _id: 'c1', title: 'Road Pothole', status: 'Pending', createdAt: new Date(Date.now() - 86400000) },
                { _id: 'c2', title: 'Trash Overflow', status: 'Resolved', createdAt: new Date(Date.now() - 2 * 86400000) },
                { _id: 'c3', title: 'Streetlight Broken', status: 'In Progress', createdAt: new Date(Date.now() - 3 * 86400000) },
            ];
        }

        res.status(200).json({
            success: true,
            data: {
                totalComplaints,
                pendingComplaints,
                resolvedComplaints,
                recentComplaints
            }
        });

    } catch (err) {
        console.error('Error fetching citizen dashboard stats:', err);
        next(new ErrorResponse('Could not fetch citizen dashboard statistics', 500));
    }
});


module.exports = router;
