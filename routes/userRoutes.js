const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { validateUserRegistration, validateLogin } = require('../utils/validation'); // Assuming these exist
const { generateToken } = require('../utils/auth'); // Assuming this exists
const { authenticate } = require('../middleware/authMiddleware'); // Assuming this exists
const ErrorResponse = require('../utils/ErrorResponse'); // Assuming this exists

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

    // Pass fullName to the User.create method
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
        avatar: user.avatar // Assuming avatar is handled by default in User model or later
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

// @desc    Get current user
// @route   GET /api/users/me
// @access  Private
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
