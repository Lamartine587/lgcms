const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Complaint = require('../models/Complaint'); // Import Complaint model
const { validateUserRegistration, validateLogin } = require('../utils/validation');
const { generateToken } = require('../utils/auth');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const ErrorResponse = require('../utils/ErrorResponse');
const upload = require('../utils/fileUpload'); // For avatar uploads
const BlacklistedToken = require('../models/BlacklistedToken'); // For logout

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
// @access  Private (Citizen, Staff)
router.get('/me', authenticate, authorize('citizen', 'staff'), async (req, res, next) => {
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

// @desc    Update current user profile
// @route   PUT /api/users/me
// @access  Private (Citizen, Staff)
router.put('/me', authenticate, authorize('citizen', 'staff'), upload.single('avatar'), async (req, res, next) => {
  try {
    const updates = {
      fullName: req.body.fullName,
      username: req.body.username,
      email: req.body.email,
    };
    if (req.file) {
      updates.avatar = req.file.path;
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        fullName: user.fullName
      }
    });
  } catch (err) {
    next(new ErrorResponse('Profile update failed', 500));
  }
});

// @desc    Logout user
// @route   POST /api/users/logout
// @access  Private (Citizen, Staff)
router.post('/logout', authenticate, authorize('citizen', 'staff'), async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
    if (token) {
      await BlacklistedToken.create({
        token,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Match JWT expiry (30 days)
      });
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(new ErrorResponse('Logout failed', 500));
  }
});

// @desc    Get citizen dashboard statistics
// @route   GET /api/users/dashboard-stats
// @access  Private (Citizen, Staff)
router.get('/dashboard-stats', authenticate, authorize('citizen', 'staff'), async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch complaint statistics
    const [totalComplaints, pendingComplaints, resolvedComplaints, recentComplaints] = await Promise.all([
      Complaint.countDocuments({ user: userId }),
      Complaint.countDocuments({ user: userId, status: 'pending' }), // Match schema enum
      Complaint.countDocuments({ user: userId, status: 'resolved' }), // Match schema enum
      Complaint.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title status createdAt')
        .lean()
    ]);

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
    console.error('Error fetching dashboard stats:', err);
    next(new ErrorResponse('Could not fetch dashboard statistics', 500));
  }
});

module.exports = router;