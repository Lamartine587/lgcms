const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Complaint = require('../models/Complaint'); // Uncomment this line to use the Complaint model
const { authenticate, authorize } = require('../middleware/authMiddleware');
const upload = require('../utils/fileUpload');
const ErrorResponse = require('../utils/ErrorResponse');
const InviteCode = require('../models/InviteCode');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const generateInviteCode = () => {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
};

const validateAdminInput = (req, res, next) => {
  const { username, email, password } = req.body;

  if (!validator.isEmail(email)) {
    return next(new ErrorResponse('Please provide a valid email', 400));
  }

  if (password.length < 8) {
    return next(new ErrorResponse('Password must be at least 8 characters', 400));
  }

  if (username.length < 3) {
    return next(new ErrorResponse('Username must be at least 3 characters', 400));
  }

  next();
};

router.post('/register', async (req, res, next) => {
    try {
        const { username, email, password, inviteCode } = req.body;

        if (!username || !email || !password || !inviteCode) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (mongoose.connection.readyState !== 1) {
            throw new Error('Database not connected');
        }

        const validCode = await InviteCode.findOne({
            code: inviteCode,
            used: false,
            expiresAt: { $gt: new Date() }
        });

        if (!validCode) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired invitation code'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const admin = await User.create({
            username,
            email,
            password: hashedPassword,
            role: 'admin'
        });

        validCode.used = true;
        validCode.usedBy = admin._id;
        await validCode.save();

        res.status(201).json({
            success: true,
            data: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Registration failed - ' + err.message
        });
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new ErrorResponse('Please provide email and password', 400));
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return next(new ErrorResponse('Invalid credentials', 401));
        }
        if (user.role !== 'admin') {
            return next(new ErrorResponse('Not authorized as admin', 401));
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return next(new ErrorResponse('Invalid credentials', 401));
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(200).json({
            success: true,
            token,
            data: user
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Login failed - ' + err.message
        });
    }
});

router.post('/logout', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        next(new ErrorResponse('Logout failed', 500));
    }
});

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
router.get('/stats', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments();

        let activeComplaintsCount = 0;
        let resolvedCasesCount = 0;
        let recentActivities = [];

        if (typeof Complaint !== 'undefined' && Complaint.collection) { // Check if Complaint model is properly defined
            activeComplaintsCount = await Complaint.countDocuments({
                status: { $in: ['Pending', 'In Progress'] }
            });
            resolvedCasesCount = await Complaint.countDocuments({
                status: 'Resolved'
            });

            recentActivities = await Complaint.find()
                                            .sort({ createdAt: -1 })
                                            .limit(5)
                                            .populate('user', 'username') // Populate the 'user' field
                                            .select('title status createdAt');

            recentActivities = recentActivities.map(comp => ({
                id: comp._id,
                type: 'Complaint',
                description: `Complaint "${comp.title}" (Status: ${comp.status}) filed by ${comp.user ? comp.user.username : 'N/A'}.`,
                timestamp: comp.createdAt
            }));

            const recentUsers = await User.find()
                                        .sort({ createdAt: -1 })
                                        .limit(5)
                                        .select('username createdAt role');

            const userActivities = recentUsers.map(user => ({
                id: user._id,
                type: 'User',
                description: `New ${user.role} user "${user.username}" registered.`,
                timestamp: user.createdAt
            }));

            recentActivities = [...recentActivities, ...userActivities]
                                .sort((a, b) => b.timestamp - a.timestamp)
                                .slice(0, 5);
        } else {
            activeComplaintsCount = 15;
            resolvedCasesCount = 85;
            recentActivities = [
                { id: 1, type: 'User Registered', description: 'New admin user "final@gmail.com" registered.', timestamp: new Date() },
                { id: 2, type: 'Complaint Filed', description: 'Complaint #1234 filed by John Doe.', timestamp: new Date(Date.now() - 3600000) },
                { id: 3, type: 'Case Resolved', description: 'Case #5678 resolved by Jane Smith.', timestamp: new Date(Date.now() - 7200000) },
            ];
        }

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                activeComplaints: activeComplaintsCount,
                resolvedCases: resolvedCasesCount,
                recentActivity: recentActivities
            }
        });

    } catch (err) {
        next(new ErrorResponse('Could not fetch dashboard statistics', 500));
    }
});


router.get('/users', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalUsers = await User.countDocuments();
        const users = await User.find()
                                .skip(skip)
                                .limit(limit)
                                .select('-password');

        res.status(200).json({
            success: true,
            data: {
                users,
                currentPage: page,
                totalPages: Math.ceil(totalUsers / limit),
                totalCount: totalUsers
            }
        });

    } catch (err) {
        next(new ErrorResponse('Could not fetch users', 500));
    }
});

// @desc    Get all complaints (for admin management)
// @route   GET /api/admin/complaints
// @access  Private/Admin
router.get('/complaints', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const statusFilter = req.query.status || 'all';
        const priorityFilter = req.query.priority || 'all';
        const skip = (page - 1) * limit;

        let query = {};
        if (statusFilter !== 'all') {
            query.status = statusFilter;
        }
        if (priorityFilter !== 'all') {
            query.priority = priorityFilter;
        }

        let complaints = [];
        let totalComplaints = 0;

        if (typeof Complaint !== 'undefined' && Complaint.collection) { // Check if Complaint model is properly defined
            totalComplaints = await Complaint.countDocuments(query);
            complaints = await Complaint.find(query)
                                        .populate('user', 'username') // Populate user who submitted it
                                        .sort({ createdAt: -1 })
                                        .skip(skip)
                                        .limit(limit);
        } else {
            // Dummy data if Complaint model is not available
            const dummyComplaints = [
                { _id: 'comp1', title: 'Leaking Pipe', user: { username: 'John Doe' }, createdAt: new Date(), status: 'Pending', priority: 'High', description: 'Pipe is leaking badly.', location: { text: '123 Main St' }, evidenceImages: ['uploads/image1.png'], evidenceVideos: [], evidencePdfs: [] },
                { _id: 'comp2', title: 'Pothole on Road', user: { username: 'Jane Smith' }, createdAt: new Date(Date.now() - 86400000), status: 'In Progress', priority: 'Medium', description: 'Large pothole on Elm Street.', location: { text: '456 Elm St' }, evidenceImages: [], evidenceVideos: [], evidencePdfs: [] },
                { _id: 'comp3', title: 'Streetlight Out', user: { username: 'Alice Brown' }, createdAt: new Date(Date.now() - 172800000), status: 'Resolved', priority: 'Low', description: 'Streetlight near park is out.', location: { text: '789 Park Ave' }, evidenceImages: [], evidenceVideos: [], evidencePdfs: [] },
                { _id: 'comp4', title: 'Illegal Dumping', user: { username: 'Bob White' }, createdAt: new Date(Date.now() - 259200000), status: 'Pending', priority: 'High', description: 'Trash dumped near river.', location: { text: 'River Side' }, evidenceImages: ['uploads/dumping.png'], evidenceVideos: [], evidencePdfs: [] },
            ];
            complaints = dummyComplaints.filter(c => {
                const statusMatch = statusFilter === 'all' || c.status === statusFilter;
                const priorityMatch = priorityFilter === 'all' || c.priority === priorityFilter;
                return statusMatch && priorityMatch;
            }).slice(skip, skip + limit);
            totalComplaints = complaints.length;
        }

        res.status(200).json({
            success: true,
            data: {
                complaints,
                currentPage: page,
                totalPages: Math.ceil(totalComplaints / limit),
                totalCount: totalComplaints
            }
        });

    } catch (err) {
        console.error('Error fetching complaints:', err);
        next(new ErrorResponse('Could not fetch complaints', 500));
    }
});

// @desc    Get single complaint by ID
// @route   GET /api/admin/complaints/:id
// @access  Private/Admin
router.get('/complaints/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const complaintId = req.params.id;
        let complaint = null;

        if (typeof Complaint !== 'undefined' && Complaint.collection) {
            complaint = await Complaint.findById(complaintId).populate('user', 'username email');
        } else {
            // Dummy data for a single complaint
            const dummyComplaints = [
                { _id: 'comp1', title: 'Leaking Pipe', user: { username: 'John Doe', email: 'john@example.com' }, createdAt: new Date(), status: 'Pending', priority: 'High', description: 'Pipe is leaking badly in the kitchen.', location: { text: '123 Main St, Apt 4B' }, evidenceImages: ['uploads/leaking_pipe.jpg'], evidenceVideos: [], evidencePdfs: [] },
                { _id: 'comp2', title: 'Pothole on Road', user: { username: 'Jane Smith', email: 'jane@example.com' }, createdAt: new Date(Date.now() - 86400000), status: 'In Progress', priority: 'Medium', description: 'Large pothole on Elm Street near the school.', location: { text: '456 Elm St' }, evidenceImages: [], evidenceVideos: ['uploads/pothole_video.mp4'], evidencePdfs: [] },
                { _id: 'comp3', title: 'Streetlight Out', user: { username: 'Alice Brown', email: 'alice@example.com' }, createdAt: new Date(Date.now() - 172800000), status: 'Resolved', priority: 'Low', description: 'Streetlight near park entrance is out, making it dark at night.', location: { text: '789 Park Ave' }, evidenceImages: [], evidenceVideos: [], evidencePdfs: ['uploads/streetlight_report.pdf'] },
                { _id: 'comp4', title: 'Illegal Dumping', user: { username: 'Bob White', email: 'bob@example.com' }, createdAt: new Date(Date.now() - 259200000), status: 'Pending', priority: 'High', description: 'Trash dumped near river, attracting pests.', location: { text: 'River Side, near bridge' }, evidenceImages: ['uploads/illegal_dumping.jpg', 'uploads/more_dumping.png'], evidenceVideos: [], evidencePdfs: [] },
            ];
            complaint = dummyComplaints.find(c => c._id === complaintId);
        }

        if (!complaint) {
            return next(new ErrorResponse('Complaint not found', 404));
        }

        res.status(200).json({
            success: true,
            data: complaint
        });

    } catch (err) {
        console.error('Error fetching single complaint:', err);
        next(new ErrorResponse('Could not fetch complaint details', 500));
    }
});

// @desc    Update complaint status and/or priority
// @route   PUT /api/admin/complaints/:id/status
// @access  Private/Admin
router.put('/complaints/:id/status', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const complaintId = req.params.id;
        const { status, priority } = req.body; // Expecting new status and/or priority

        if (!status && !priority) {
            return next(new ErrorResponse('No status or priority provided for update', 400));
        }

        let updatedComplaint = null;
        if (typeof Complaint !== 'undefined' && Complaint.collection) {
            const updateFields = {};
            if (status) updateFields.status = status;
            if (priority) updateFields.priority = priority;

            updatedComplaint = await Complaint.findByIdAndUpdate(
                complaintId,
                { $set: updateFields },
                { new: true, runValidators: true } // Return the updated document and run schema validators
            );
        } else {
            // Dummy update for demonstration
            console.log(`Dummy update: Complaint ${complaintId} to status: ${status}, priority: ${priority}`);
            updatedComplaint = { _id: complaintId, status: status || 'N/A', priority: priority || 'N/A', message: 'Dummy update successful' };
        }

        if (!updatedComplaint) {
            return next(new ErrorResponse('Complaint not found or could not be updated', 404));
        }

        res.status(200).json({
            success: true,
            message: 'Complaint updated successfully',
            data: updatedComplaint
        });

    } catch (err) {
        console.error('Error updating complaint status:', err);
        next(new ErrorResponse('Could not update complaint status', 500));
    }
});


router.post('/generate-invite', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const inviteCode = generateInviteCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const newInvite = new InviteCode({
      code: inviteCode,
      createdBy: req.user.id,
      expiresAt,
      used: false
    });

    await newInvite.save();

    res.status(201).json({
      success: true,
      data: {
        code: inviteCode,
        expiresAt,
        createdBy: req.user.id
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/profile', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const admin = await User.findById(req.user.id)
      .select('-password')
      .populate('department', 'name');

    if (!admin) {
      return next(new ErrorResponse('Admin not found', 404));
    }

    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (err) {
    next(err);
  }
});

router.put('/profile', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { fullName, email, phone, department, bio } = req.body;

    if (email && !validator.isEmail(email)) {
      return next(new ErrorResponse('Please provide a valid email', 400));
    }

    const admin = await User.findByIdAndUpdate(
      req.user.id,
      { fullName, email, phone, department, bio },
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/avatar',
  authenticate,
  authorize('admin'),
  upload.single('avatar'),
  async (req, res, next) => {
    try {
      const admin = await User.findById(req.user.id);

      if (!admin) {
        return next(new ErrorResponse('Admin not found', 404));
      }

      if (req.file) {
        admin.avatar = req.file.path;
        await admin.save();
      }

      res.status(200).json({
        success: true,
        data: admin.avatar
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
