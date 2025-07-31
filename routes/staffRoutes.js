const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const ErrorResponse = require('../utils/ErrorResponse');
const validator = require('validator');

// @desc    Staff login
// @route   POST /api/staff/login
// @access  Public
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  console.log('Login attempt:', { email, receivedAt: new Date().toISOString() }); // Enhanced debug log

  // Validate input
  if (!email || !password) {
    console.log('Missing email or password');
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  if (!validator.isEmail(email)) {
    console.log('Invalid email format:', email);
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  try {
    // Case-insensitive email query
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }, 
      role: 'staff' 
    })
      .select('+password')
      .populate('department', 'name description')
      .catch(err => {
        console.error('Department population error:', err.message); // Log population errors
        return null; // Continue without department if population fails
      });

    if (!user) {
      console.log('User not found or not staff:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('Found user:', { 
      email: user.email, 
      role: user.role, 
      userId: user.userId, 
      department: user.department ? user.department._id : 'none' 
    });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Password mismatch for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = user.generateAuthToken();

    res.json({
      success: true,
      token,
      data: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department || null, // Handle null department
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Login error:', err.message, err.stack); // Enhanced error logging
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @desc    Get staff profile
// @route   GET /api/staff/me
// @access  Private (Staff)
router.get('/me', authenticate, authorize('staff'), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -__v')
      .populate('department', 'name description');

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Profile fetch error:', err.message, err.stack);
    next(new ErrorResponse('Server error', 500));
  }
});

// @desc    Get assigned complaints with pagination
// @route   GET /api/staff/complaints
// @access  Private (Staff)
router.get('/complaints', authenticate, authorize('staff'), async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Status filter
    const status = req.query.status;
    const query = { assignedTo: req.user.id };
    if (status) query.status = status;

    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username email')
      .populate('category', 'name');

    const total = await Complaint.countDocuments(query);

    res.status(200).json({
      success: true,
      count: complaints.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: complaints
    });
  } catch (err) {
    console.error('Complaints fetch error:', err.message, err.stack);
    next(new ErrorResponse('Failed to fetch complaints', 500));
  }
});

// @desc    Get staff dashboard statistics
// @route   GET /api/staff/dashboard
// @access  Private (Staff)
router.get('/dashboard', authenticate, authorize('staff'), async (req, res, next) => {
  try {
    const [assigned, pending, inProgress, resolved] = await Promise.all([
      Complaint.countDocuments({ assignedTo: req.user.id }),
      Complaint.countDocuments({ assignedTo: req.user.id, status: 'Pending' }),
      Complaint.countDocuments({ assignedTo: req.user.id, status: 'In Progress' }),
      Complaint.countDocuments({ assignedTo: req.user.id, status: 'Resolved' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        assigned,
        pending,
        inProgress,
        resolved,
        completionRate: assigned > 0 ? Math.round((resolved / assigned) * 100) : 0
      }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err.message, err.stack);
    next(new ErrorResponse('Failed to fetch dashboard data', 500));
  }
});

module.exports = router;