const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const InviteCode = require('../models/InviteCode');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const upload = require('../utils/fileUpload');
const ErrorResponse = require('../utils/ErrorResponse');
const rateLimit = require('express-rate-limit');
const cache = require('memory-cache');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const ChartJS = require('chart.js');
const { createCanvas } = require('canvas');

// Rate limiting configuration
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests, please try again later'
});

// Constants
const INVITE_CODE_EXPIRY_DAYS = 7;
const DEFAULT_PAGE_SIZE = 10;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper functions
const generateInviteCode = () => crypto.randomBytes(8).toString('hex').toUpperCase();

/**
 * Validates admin registration input
 */
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

/**
 * Validates complaint status update
 */
const validateStatusUpdate = (req, res, next) => {
    const { status, priority } = req.body;
    const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];

    if (status && !validStatuses.includes(status)) {
        return next(new ErrorResponse('Invalid status value', 400));
    }

    if (priority && !validPriorities.includes(priority)) {
        return next(new ErrorResponse('Invalid priority value', 400));
    }

    next();
};

/**
 * ADMIN AUTHENTICATION ROUTES
 */

router.post('/register', validateAdminInput, async (req, res, next) => {
    try {
        const { username, email, password, inviteCode } = req.body;

        // Check database connection
        if (mongoose.connection.readyState !== 1) {
            throw new Error('Database not connected');
        }

        // Validate invite code
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

        // Check for existing user
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Create new admin user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const admin = await User.create({
            username,
            email,
            password: hashedPassword,
            role: 'admin'
        });

        // Mark invite code as used
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
        next(new ErrorResponse(`Registration failed: ${err.message}`, 500));
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new ErrorResponse('Please provide email and password', 400));
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user || user.role !== 'admin') {
            return next(new ErrorResponse('Invalid credentials', 401));
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

        res.json({
            success: true,
            token,
            data: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        next(new ErrorResponse('Login failed', 500));
    }
});

router.post('/logout', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        next(new ErrorResponse('Logout failed', 500));
    }
});

/**
 * DASHBOARD ROUTES
 */

router.get('/stats', authenticate, authorize('admin'), async (req, res, next) => {
    const cacheKey = `admin-stats-${req.user.id}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
        return res.json({ success: true, fromCache: true, data: cached });
    }
    
    try {
        // Parallel database queries
        const [totalUsers, activeComplaints, resolvedCases] = await Promise.all([
            User.countDocuments(),
            Complaint.countDocuments({ status: { $in: ['Pending', 'In Progress'] } }),
            Complaint.countDocuments({ status: 'Resolved' })
        ]);

        // Get recent activity
        const [recentComplaints, recentUsers] = await Promise.all([
            Complaint.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('user', 'username')
                .lean(),
            User.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .lean()
        ]);

        const recentActivity = [
            ...recentComplaints.map(c => ({
                type: 'Complaint',
                description: `Complaint "${c.title}" (${c.status}) by ${c.user?.username || 'Anonymous'}`,
                timestamp: c.createdAt
            })),
            ...recentUsers.map(u => ({
                type: 'User',
                description: `New ${u.role} user "${u.username}" registered`,
                timestamp: u.createdAt
            }))
        ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

        const stats = {
            totalUsers,
            activeComplaints,
            resolvedCases,
            todayActivity: recentActivity.length,
            recentActivity
        };

        cache.put(cacheKey, stats, CACHE_TTL);

        res.json({ success: true, fromCache: false, data: stats });
    } catch (err) {
        next(new ErrorResponse('Failed to fetch dashboard stats', 500));
    }
});

/**
 * USER MANAGEMENT ROUTES
 */

router.get('/users', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || DEFAULT_PAGE_SIZE;
        const skip = (page - 1) * limit;

        // Parallel count and data fetch
        const [totalUsers, users] = await Promise.all([
            User.countDocuments(),
            User.find()
                .skip(skip)
                .limit(limit)
                .select('-password -__v')
                .lean()
        ]);

        res.json({
            success: true,
            data: {
                users,
                currentPage: page,
                totalPages: Math.ceil(totalUsers / limit),
                totalCount: totalUsers
            }
        });
    } catch (err) {
        next(new ErrorResponse('Failed to fetch users', 500));
    }
});

/**
 * COMPLAINT MANAGEMENT ROUTES
 */

router.get('/complaints', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || DEFAULT_PAGE_SIZE;
        const { status, priority } = req.query;
        const skip = (page - 1) * limit;

        // Build query
        const query = {};
        if (status && status !== 'all') query.status = status;
        if (priority && priority !== 'all') query.priority = priority;

        // Parallel count and data fetch
        const [totalComplaints, complaints] = await Promise.all([
            Complaint.countDocuments(query),
            Complaint.find(query)
                .populate('user', 'username')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        res.json({
            success: true,
            data: {
                complaints,
                currentPage: page,
                totalPages: Math.ceil(totalComplaints / limit),
                totalCount: totalComplaints
            }
        });
    } catch (err) {
        next(new ErrorResponse('Failed to fetch complaints', 500));
    }
});

router.get('/complaints/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate('user', 'username email')
            .lean();

        if (!complaint) {
            return next(new ErrorResponse('Complaint not found', 404));
        }

        res.json({ success: true, data: complaint });
    } catch (err) {
        next(new ErrorResponse('Failed to fetch complaint', 500));
    }
});

router.put('/complaints/:id/status', authenticate, authorize('admin'), validateStatusUpdate, async (req, res, next) => {
    try {
        const { status, priority } = req.body;
        const updateFields = {};
        if (status) updateFields.status = status;
        if (priority) updateFields.priority = priority;

        const updatedComplaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).lean();

        if (!updatedComplaint) {
            return next(new ErrorResponse('Complaint not found', 404));
        }

        // Invalidate stats cache
        cache.del(`admin-stats-${req.user.id}`);

        res.json({
            success: true,
            message: 'Complaint updated successfully',
            data: updatedComplaint
        });
    } catch (err) {
        next(new ErrorResponse('Failed to update complaint', 500));
    }
});

/**
 * CHART DATA ROUTES
 */

router.get('/charts/:type', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { type } = req.params;
        const canvas = createCanvas(800, 400);
        const ctx = canvas.getContext('2d');

        let chartConfig;
        switch (type) {
            case 'complaint-status':
                const statusCounts = await Complaint.aggregate([
                    { $group: { _id: '$status', count: { $sum: 1 } } }
                ]);
                
                chartConfig = {
                    type: 'doughnut',
                    data: {
                        labels: statusCounts.map(s => s._id),
                        datasets: [{
                            data: statusCounts.map(s => s.count),
                            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
                        }]
                    }
                };
                break;
                
            case 'complaint-trends':
                const trends = await Complaint.aggregate([
                    { 
                        $group: { 
                            _id: { 
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } },
                    { $limit: 12 }
                ]);
                
                chartConfig = {
                    type: 'line',
                    data: {
                        labels: trends.map(t => `${t._id.month}/${t._id.year}`),
                        datasets: [{
                            label: 'Complaints',
                            data: trends.map(t => t.count),
                            borderColor: '#36A2EB',
                            fill: false
                        }]
                    }
                };
                break;
                
            case 'user-role':
                const roleCounts = await User.aggregate([
                    { $group: { _id: '$role', count: { $sum: 1 } } }
                ]);
                
                chartConfig = {
                    type: 'pie',
                    data: {
                        labels: roleCounts.map(r => r._id),
                        datasets: [{
                            data: roleCounts.map(r => r.count),
                            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
                        }]
                    }
                };
                break;
                
            default:
                return next(new ErrorResponse('Invalid chart type', 400));
        }

        new ChartJS(ctx, chartConfig);
        
        res.json({
            success: true,
            data: chartConfig
        });
    } catch (err) {
        next(new ErrorResponse('Failed to generate chart', 500));
    }
});

/**
 * PREDICTION ROUTES
 */

router.post('/predict/resolution_time', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { complaint_description_length, num_evidence_files } = req.body;
        
        // Mock prediction - replace with actual ML model
        const baseDays = 5;
        const descFactor = complaint_description_length / 100;
        const evidenceFactor = num_evidence_files * 0.5;
        const predictedDays = Math.max(1, Math.min(30, 
            baseDays + descFactor + evidenceFactor + (Math.random() * 2 - 1)
        )).toFixed(1);
        
        res.json({
            success: true,
            predicted_resolution_time_days: predictedDays,
            explanation: `Based on description length (${complaint_description_length} words) and ${num_evidence_files} evidence files`
        });
    } catch (err) {
        next(new ErrorResponse('Prediction failed', 500));
    }
});

/**
 * ADMIN UTILITY ROUTES
 */

router.post('/generate-invite', authenticate, authorize('admin'), apiLimiter, async (req, res, next) => {
    try {
        const expiresAt = new Date(Date.now() + INVITE_CODE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        const newInvite = new InviteCode({
            code: generateInviteCode(),
            createdBy: req.user.id,
            expiresAt,
            used: false
        });

        await newInvite.save();

        res.status(201).json({
            success: true,
            data: {
                code: newInvite.code,
                expiresAt,
                createdBy: req.user.id
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;