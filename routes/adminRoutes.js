// routes/adminRoutes.js

require('dotenv').config(); // Load environment variables
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const InviteCode = require('../models/InviteCode');
const Department = require('../models/Department'); // Make sure this path is correct
const { authenticate, authorize } = require('../middleware/authMiddleware');
// const upload = require('../utils/fileUpload'); // Uncomment if you use a centralized file upload config here
const ErrorResponse = require('../utils/ErrorResponse');
const rateLimit = require('express-rate-limit');
const cache = require('memory-cache'); // npm install memory-cache
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const validator = require('validator'); // npm install validator
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs'); // npm install exceljs
const path = require('path'); // Node.js built-in module

// Rate limiting configuration
const apiLimiter = rateLimit({
    windowMs: 2 * 60 * 60 * 1000, // 2 hours
    max: 100, // Max 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 2 hours'
});

// Constants
const INVITE_CODE_EXPIRY_DAYS = 7;
const DEFAULT_PAGE_SIZE = 10;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes (for dashboard stats caching)

// Helper functions
const generateInviteCode = () => crypto.randomBytes(8).toString('hex').toUpperCase();

/**
 * Validates admin/staff registration input
 */
const validateAdminInput = (req, res, next) => {
    const { username, email, password } = req.body;

    if (!email || !password || !username) {
        return next(new ErrorResponse('Please provide username, email, and password', 400));
    }
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
 * Validates complaint status/priority update
 */
const validateComplaintUpdate = (req, res, next) => {
    const { status, priority, assignedTo, responseText } = req.body;
    const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];

    if (status && !validStatuses.includes(status)) {
        return next(new ErrorResponse('Invalid status value', 400));
    }

    if (priority && !validPriorities.includes(priority)) {
        return next(new ErrorResponse('Invalid priority value', 400));
    }

    // assignedTo can be null/empty string to unassign
    if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
        return next(new ErrorResponse('Invalid staff ID format for assignment', 400));
    }
    
    // responseText is optional, no specific validation needed beyond presence for logging

    next();
};

// Apply API rate limiting to all admin routes (optional, adjust as needed)
router.use(apiLimiter);

/**
 * ADMIN AUTHENTICATION ROUTES
 */

// @desc    Register initial admin (requires invite code)
// @route   POST /api/admin/register
// @access  Public (for initial setup)
router.post('/register', validateAdminInput, async (req, res, next) => {
    try {
        const { username, email, password, inviteCode } = req.body;

        const validCode = await InviteCode.findOne({
            code: inviteCode,
            used: false,
            expiresAt: { $gt: new Date() }
        });

        if (!validCode) {
            return next(new ErrorResponse('Invalid or expired invitation code', 400));
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return next(new ErrorResponse('Email already registered', 400));
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const admin = await User.create({
            username,
            email,
            password: hashedPassword,
            role: 'admin' // Fixed role for initial setup
        });

        validCode.used = true;
        validCode.usedBy = admin._id;
        await validCode.save();

        res.status(201).json({
            success: true,
            message: 'Admin registered successfully!',
            data: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (err) {
        console.error('Admin registration failed:', err);
        next(new ErrorResponse(`Registration failed: ${err.message}`, 500));
    }
});

// @desc    Admin creates new Staff members
// @route   POST /api/admin/create-staff
// @access  Private (Admin only)
router.post('/create-staff', authenticate, authorize('admin'), validateAdminInput, async (req, res, next) => {
    try {
        const { username, email, password, department } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return next(new ErrorResponse('Email already registered', 400));
        }

        // Validate department existence if provided
        if (department) {
            if (!mongoose.Types.ObjectId.isValid(department)) {
                return next(new ErrorResponse('Invalid Department ID format', 400));
            }
            const departmentExists = await Department.findById(department);
            if (!departmentExists) {
                return next(new ErrorResponse('Department not found', 404));
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newStaff = await User.create({
            username,
            email,
            password: hashedPassword,
            role: 'staff', // Automatically set to staff
            department: department || undefined // Assign department or leave undefined
        });

        res.status(201).json({
            success: true,
            message: 'Staff member registered successfully!',
            data: {
                id: newStaff._id,
                username: newStaff.username,
                email: newStaff.email,
                role: newStaff.role,
                department: newStaff.department // Send back the department ID
            }
        });

    } catch (err) {
        console.error('Staff registration failed:', err);
        next(new ErrorResponse(`Staff registration failed: ${err.message}`, 500));
    }
});


// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new ErrorResponse('Please provide email and password', 400));
        }

        const user = await User.findOne({ email }).select('+password');
        // Check if user exists and is either 'admin' or 'staff'
        if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
            return next(new ErrorResponse('Invalid credentials or unauthorized role', 401));
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
        console.error('Admin/Staff login failed:', err);
        next(new ErrorResponse('Login failed', 500));
    }
});

// @desc    Admin/Staff logout
// @route   POST /api/admin/logout
// @access  Private (Admin, Staff)
router.post('/logout', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    try {
        // For JWT, client-side simply discards the token.
        // If using refresh tokens/blacklist, logic would go here.
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        console.error('Logout failed:', err);
        next(new ErrorResponse('Logout failed', 500));
    }
});

/**
 * DASHBOARD ROUTES
 */

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private (Admin, Staff)
router.get('/stats', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    const cacheKey = `admin-stats-${req.user.id}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
        return res.json({ success: true, fromCache: true, data: cached });
    }
    
    try {
        // Parallel database queries
        const [totalUsers, activeComplaints, resolvedCases, resolvedComplaintsForAvg] = await Promise.all([
            User.countDocuments(), // All users (citizens, staff, admin)
            Complaint.countDocuments({ status: { $in: ['Pending', 'In Progress'] } }),
            Complaint.countDocuments({ status: 'Resolved' }),
            Complaint.find({ status: 'Resolved' }).select('createdAt resolvedAt').lean()
        ]);

        let avgResolutionTimeDays = 0;
        if (resolvedComplaintsForAvg.length > 0) {
            const totalDurationMs = resolvedComplaintsForAvg.reduce((sum, c) => {
                // Use resolvedAt if available, otherwise fallback to createdAt (might indicate immediate resolution or no specific resolvedAt)
                const resolvedDate = c.resolvedAt ? new Date(c.resolvedAt) : new Date(c.createdAt);
                const createdDate = new Date(c.createdAt);
                return sum + (resolvedDate.getTime() - createdDate.getTime()); // Use getTime() for reliable subtraction
            }, 0);
            avgResolutionTimeDays = (totalDurationMs / resolvedComplaintsForAvg.length) / (1000 * 3600 * 24);
        }

        // Get recent activity (5 latest complaints or new users)
        const [recentComplaints, recentUsers] = await Promise.all([
            Complaint.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('user', 'username') // Populate to show user's username
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
        ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5); // Sort by timestamp, get top 5

        const stats = {
            totalUsers,
            activeComplaints,
            resolvedCases,
            avgResolutionTime: avgResolutionTimeDays.toFixed(1),
            // todayActivity could be calculated based on recentActivity count from today, if filtered.
            // For now, it's a placeholder or based on the general recent activity count.
            todayActivity: recentActivity.length, // Consider refining this if you need actual "today's" activity
            recentActivity
        };

        cache.put(cacheKey, stats, CACHE_TTL);

        res.json({ success: true, fromCache: false, data: stats });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        next(new ErrorResponse('Failed to fetch dashboard stats', 500));
    }
});

/**
 * USER MANAGEMENT ROUTES
 */

// @desc    Get all users (admin only)
// @route   GET /api/admin/users
// @access  Private (Admin only)
router.get('/users', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || DEFAULT_PAGE_SIZE;
        const skip = (page - 1) * limit;
        const roleFilter = req.query.role; // Filter by role (e.g., 'citizen', 'staff', 'admin')

        const query = {};
        if (roleFilter) {
            query.role = roleFilter;
        }

        const [totalUsers, users] = await Promise.all([
            User.countDocuments(query),
            User.find(query)
                .populate('department', 'name') // Populate department name for staff/admin
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('-password -__v') // Exclude sensitive fields
                .lean() // Return plain JS objects
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
        console.error('Error fetching users:', err);
        next(new ErrorResponse('Failed to fetch users', 500));
    }
});

// @desc    Get all staff members (admin, staff)
// @route   GET /api/admin/users/staff
// @access  Private (Admin, Staff)
router.get('/users/staff', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    try {
        const staffUsers = await User.find({ role: { $in: ['staff', 'admin'] } }) // Include admin for assignment too
            .select('_id username email department') // Select relevant fields
            .populate('department', 'name') // Populate department name
            .lean(); // Return plain JS objects

        res.json({
            success: true,
            data: staffUsers // Return an array directly, not nested under 'staff'
        });
    } catch (err) {
        console.error('Error fetching staff members:', err);
        next(new ErrorResponse('Failed to fetch staff members', 500));
    }
});

// @desc    Fetch all departments
// @route   GET /api/admin/departments
// @access  Private (Admin, Staff)
router.get('/departments', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    try {
        const departments = await Department.find({}).select('_id name').lean();
        res.json({ success: true, data: departments });
    } catch (err) {
        console.error('Error fetching departments:', err);
        next(new ErrorResponse('Failed to fetch departments', 500));
    }
});


// @desc    Check authentication status
// @route   GET /api/admin/auth/check
// @access  Private (Any authenticated admin/staff)
router.get('/auth/check', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Auth check failed:', err);
    res.status(500).json({ success: false, message: 'Internal server error during auth check' });
  }
});

/**
 * ML ANALYTICS ROUTES (These typically interact with an ML service, here simulated)
 */

// @desc    Get complaint status distribution
// @route   GET /api/admin/ml/complaint_status_distribution
// @access  Private (Admin, Staff)
router.get('/ml/complaint_status_distribution', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    try {
        const statusCounts = await Complaint.aggregate([
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]);
        
        res.json({
            success: true,
            data: {
                type: "doughnut",
                data: {
                    labels: statusCounts.map(s => s._id),
                    datasets: [{
                        data: statusCounts.map(s => s.count),
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'] // Example colors
                    }]
                }
            }
        });
    } catch (err) {
        console.error('Error generating status distribution:', err);
        next(new ErrorResponse('Failed to generate status distribution', 500));
    }
});

// @desc    Get complaint trends over time
// @route   GET /api/admin/ml/complaint_trends
// @access  Private (Admin, Staff)
router.get('/ml/complaint_trends', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    try {
        const trends = await Complaint.aggregate([
            { 
                "$group": { 
                    "_id": { 
                        "year": {"$year": "$createdAt"},
                        "month": {"$month": "$createdAt"}
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id.year": 1, "_id.month": 1}},
            {"$limit": 12} // Last 12 months/periods
        ]);
        
        res.json({
            success: true,
            data: {
                type: "line",
                data: {
                    labels: trends.map(t => `${t._id.month}/${t._id.year}`),
                    datasets: [{
                        label: "Complaints",
                        data: trends.map(t => t.count),
                        borderColor: "#36A2EB",
                        fill: false
                    }]
                }
            }
        });
    } catch (err) {
        console.error('Error generating complaint trends:', err);
        next(new ErrorResponse('Failed to generate trends', 500));
    }
});

// @desc    Get complaint category distribution (similar to status distribution)
// @route   GET /api/admin/ml/complaint_category_distribution
// @access  Private (Admin, Staff)
router.get('/ml/complaint_category_distribution', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    try {
        const categoryCounts = await Complaint.aggregate([
            {"$group": {"_id": "$category", "count": {"$sum": 1}}}
        ]);
        
        const backgroundColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#A1B56C', '#D2B48C', '#87CEEB'
        ];

        res.json({
            success: true,
            data: {
                type: "pie",
                data: {
                    labels: categoryCounts.map(c => c._id),
                    datasets: [{
                        label: "Complaints by Category",
                        data: categoryCounts.map(c => c.count),
                        backgroundColor: categoryCounts.map((_, i) => backgroundColors[i % backgroundColors.length]),
                        borderColor: '#fff',
                        borderWidth: 1
                    }]
                }
            }
        });
    } catch (err) {
        console.error('Error generating category distribution:', err);
        next(new ErrorResponse('Failed to generate category distribution', 500));
    }
});

// @desc    Predict resolution time (simulated ML endpoint)
// @route   POST /api/admin/ml/predict/resolution_time
// @access  Private (Admin, Staff)
router.post('/ml/predict/resolution_time', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    try {
        const { complaint_description_length, num_evidence_files } = req.body;
        
        // Basic simulation logic for prediction
        // In a real scenario, this would forward to your Flask ML service or call a local ML model
        if (typeof complaint_description_length !== 'number' || typeof num_evidence_files !== 'number' || complaint_description_length < 0 || num_evidence_files < 0) {
            return next(new ErrorResponse('Invalid input for prediction', 400));
        }

        const baseDays = 5;
        const descFactor = complaint_description_length / 100; // Longer descriptions might take more time
        const evidenceFactor = num_evidence_files * 0.5; // More evidence might add a bit of time
        
        // Add some randomness for more realistic simulation
        const predictedDays = Math.max(1, Math.min(30, 
            baseDays + descFactor + evidenceFactor + (Math.random() * 3 - 1.5) // +/- 1.5 days random factor
        )).toFixed(1); // To 1 decimal place
        
        res.json({
            success: true,
            predicted_resolution_time_days: parseFloat(predictedDays), // Return as number
            explanation: `Predicted based on description length (${complaint_description_length} words) and ${num_evidence_files} evidence files.`
        });
    } catch (err) {
        console.error('Prediction failed:', err);
        next(new ErrorResponse('Prediction failed', 500));
    }
});

/**
 * COMPLAINT MANAGEMENT ROUTES (Admin/Staff specific)
 * Note: These mirror some public complaint routes but are for admin/staff to manage ALL complaints.
 */

// @desc    Get all complaints for admin/staff with filters, search, and pagination
// @route   GET /api/admin/complaints
// @access  Private (Admin, Staff)
router.get('/complaints', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || DEFAULT_PAGE_SIZE;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.status && req.query.status !== 'all') {
            filter.status = req.query.status;
        }
        if (req.query.priority && req.query.priority !== 'all') {
            filter.priority = req.query.priority;
        }
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i'); // Case-insensitive search
            filter.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { category: searchRegex },
                // Allow searching by anonymous complaints (null user) or by username/email of registered user
                // This requires a separate lookup or a more complex aggregation if populating and searching
                // For simplicity, directly searching on populated fields is less performant but common.
                // A better approach for searching populated fields for large datasets would be an
                // aggregate pipeline with $lookup and $match.
            ];
            // If you want to search by populated user/assignedTo fields, you'd need to adjust this.
            // For example, to search by username or email, you'd need to find users first.
            // For now, it only searches on the Complaint document itself.
        }

        const totalComplaints = await Complaint.countDocuments(filter);
        const complaints = await Complaint.find(filter)
                                        .populate({
                                            path: 'user', // Populate the user who submitted the complaint
                                            select: 'username email' // Only fetch username and email
                                        })
                                        .populate({
                                            path: 'assignedTo', // Populate the staff member assigned
                                            select: 'username email'
                                        })
                                        .sort({ createdAt: -1 }) // Sort by newest first
                                        .skip(skip)
                                        .limit(limit)
                                        .lean(); // Return plain JS objects

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
        console.error('Error fetching all complaints for admin:', err);
        next(new ErrorResponse('Could not fetch complaints', 500));
    }
});

// @desc    Get single complaint details by ID (for admin/staff)
// @route   GET /api/admin/complaints/:id
// @access  Private (Admin, Staff)
router.get('/complaints/:id', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
                                        .populate({
                                            path: 'user',
                                            select: 'username email'
                                        })
                                        .populate({
                                            path: 'assignedTo',
                                            select: 'username email'
                                        })
                                        .lean();

        if (!complaint) {
            return next(new ErrorResponse('Complaint not found', 404));
        }

        res.status(200).json({
            success: true,
            data: complaint
        });

    } catch (err) {
        console.error('Error fetching single complaint for admin:', err);
        if (err.kind === 'ObjectId') {
            return next(new ErrorResponse('Complaint not found', 404));
        }
        next(new ErrorResponse('Could not fetch complaint details', 500));
    }
});

// @desc    Update complaint status, priority, assignment, and add response
// @route   PUT /api/admin/complaints/:id
// @access  Private (Admin, Staff)
router.put('/complaints/:id', authenticate, authorize('admin', 'staff'), validateComplaintUpdate, async (req, res, next) => {
    try {
        const { status, priority, assignedTo, responseText } = req.body;

        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return next(new ErrorResponse('Complaint not found', 404));
        }

        // Update status if provided and different
        if (status && complaint.status !== status) {
            complaint.status = status;
            // If status is resolved, set resolvedAt
            if (status === 'Resolved' && !complaint.resolvedAt) {
                complaint.resolvedAt = new Date();
            } else if (status !== 'Resolved' && complaint.resolvedAt) {
                // If status changes from resolved, clear resolvedAt
                complaint.resolvedAt = undefined;
            }
        }

        // Update priority if provided and different
        if (priority && complaint.priority !== priority) {
            complaint.priority = priority;
        }

        // Update assignedTo if provided and different, or unassign
        if (assignedTo !== undefined) { // Check if assignedTo key is even present
            if (assignedTo === null || assignedTo === '') { // Allow explicit unassignment
                complaint.assignedTo = undefined; // Or null, based on your schema's definition for optional ref
            } else {
                if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
                    return next(new ErrorResponse('Invalid staff ID format', 400));
                }
                const staffUser = await User.findOne({ _id: assignedTo, role: { $in: ['staff', 'admin'] } });
                if (!staffUser) {
                    return next(new ErrorResponse('Assigned user not found or is not a staff member/admin', 400));
                }
                complaint.assignedTo = assignedTo;
            }
        }

        // Add to response history if responseText is provided
        if (responseText) {
            complaint.responseHistory.push({
                responder: req.user.username, // Name of the logged-in admin/staff
                text: responseText,
                timestamp: new Date()
            });
            complaint.markModified('responseHistory'); // Important for Mongoose to detect array changes
        }
        
        await complaint.save(); // Save the updated complaint

        // Invalidate cache for dashboard stats
        cache.del(`admin-stats-${req.user.id}`);

        res.status(200).json({
            success: true,
            message: 'Complaint updated successfully',
            data: complaint // Send back the updated complaint
        });

    } catch (err) {
        console.error('Error updating complaint:', err);
        if (err.name === 'CastError' && err.path === '_id') {
            return next(new ErrorResponse('Invalid Complaint ID format', 400));
        }
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return next(new ErrorResponse(messages.join(', '), 400));
        }
        next(new ErrorResponse('Could not update complaint', 500));
    }
});

// @desc    Delete a complaint (admin only)
// @route   DELETE /api/admin/complaints/:id
// @access  Private (Admin only)
router.delete('/complaints/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        // Using findByIdAndDelete directly is often simpler for deletion
        const complaint = await Complaint.findByIdAndDelete(req.params.id);

        if (!complaint) {
            return next(new ErrorResponse('Complaint not found', 404));
        }

        // Invalidate cache for dashboard stats
        cache.del(`admin-stats-${req.user.id}`);

        res.status(200).json({
            success: true,
            message: 'Complaint deleted successfully'
        });

    } catch (err) {
        console.error('Error deleting complaint:', err);
        if (err.name === 'CastError' && err.path === '_id') {
            return next(new ErrorResponse('Invalid Complaint ID format', 400));
        }
        next(new ErrorResponse('Could not delete complaint', 500));
    }
});


// @desc    Export complaints to Excel (admin, staff)
// @route   GET /api/admin/complaints/export
// @access  Private (Admin, Staff)
router.get('/complaints/export', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    try {
        const complaints = await Complaint.find()
                                        .populate({ path: 'user', select: 'username email' })
                                        .populate({ path: 'assignedTo', select: 'username email' })
                                        .sort({ createdAt: -1 })
                                        .lean(); // Work with plain JS objects for ExcelJS

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Complaints');

        // Define columns for the Excel sheet
        worksheet.columns = [
            { header: 'ID', key: '_id', width: 10 },
            { header: 'Title', key: 'title', width: 30 },
            { header: 'Description', key: 'description', width: 50 },
            { header: 'Category', key: 'category', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Priority', key: 'priority', width: 15 },
            { header: 'Location Type', key: 'locationType', width: 15 }, // Added
            { header: 'Location Text', key: 'locationText', width: 30 },
            { header: 'Latitude', key: 'latitude', width: 15 },
            { header: 'Longitude', key: 'longitude', width: 15 },
            { header: 'Submitted By (Username)', key: 'submittedByUsername', width: 25 },
            { header: 'Submitted By (Email)', key: 'submittedByEmail', width: 30 },
            { header: 'Assigned To (Username)', key: 'assignedToUsername', width: 25 },
            { header: 'Assigned To (Email)', key: 'assignedToEmail', width: 30 },
            { header: 'Submitted At', key: 'createdAt', width: 25 },
            { header: 'Last Updated At', key: 'updatedAt', width: 25 },
            { header: 'Resolved At', key: 'resolvedAt', width: 25 }, // Added
            { header: 'Response History', key: 'responseHistory', width: 50 },
            { header: 'Image URLs', key: 'imageUrls', width: 50 }, // Added
            { header: 'Video URLs', key: 'videoUrls', width: 50 }, // Added
            { header: 'PDF URLs', key: 'pdfUrls', width: 50 }, // Added
        ];

        // Add rows to the worksheet
        complaints.forEach(complaint => {
            worksheet.addRow({
                _id: complaint._id.toString(),
                title: complaint.title,
                description: complaint.description,
                category: complaint.category,
                status: complaint.status,
                priority: complaint.priority,
                locationType: complaint.location ? complaint.location.type : 'N/A',
                locationText: complaint.location ? complaint.location.text : 'N/A',
                latitude: complaint.location && complaint.location.coordinates && complaint.location.coordinates.length === 2 ? complaint.location.coordinates[1] : 'N/A',
                longitude: complaint.location && complaint.location.coordinates && complaint.location.coordinates.length === 2 ? complaint.location.coordinates[0] : 'N/A',
                submittedByUsername: complaint.user ? complaint.user.username : 'Anonymous',
                submittedByEmail: complaint.user ? complaint.user.email : 'N/A',
                assignedToUsername: complaint.assignedTo ? complaint.assignedTo.username : 'Unassigned',
                assignedToEmail: complaint.assignedTo ? complaint.assignedTo.email : 'N/A',
                createdAt: complaint.createdAt ? complaint.createdAt.toLocaleString() : 'N/A',
                updatedAt: complaint.updatedAt ? complaint.updatedAt.toLocaleString() : 'N/A',
                resolvedAt: complaint.resolvedAt ? complaint.resolvedAt.toLocaleString() : 'N/A',
                responseHistory: complaint.responseHistory && complaint.responseHistory.length > 0 ? 
                                 complaint.responseHistory.map(r => `${r.responder} (${r.timestamp.toLocaleString()}): ${r.text}`).join('\n') : 'N/A',
                imageUrls: complaint.evidenceImages && complaint.evidenceImages.length > 0 ? 
                           complaint.evidenceImages.map(url => `${req.protocol}://${req.get('host')}/${url}`).join(', ') : 'N/A',
                videoUrls: complaint.evidenceVideos && complaint.evidenceVideos.length > 0 ? 
                           complaint.evidenceVideos.map(url => `${req.protocol}://${req.get('host')}/${url}`).join(', ') : 'N/A',
                pdfUrls: complaint.evidencePdfs && complaint.evidencePdfs.length > 0 ? 
                         complaint.evidencePdfs.map(url => `${req.protocol}://${req.get('host')}/${url}`).join(', ') : 'N/A',
            });
        });

        // Set response headers for Excel download
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + 'complaints.xlsx'
        );

        // Write to response stream
        await workbook.xlsx.write(res);
        res.end(); // End the response after sending the file

    } catch (err) {
        console.error('Error exporting complaints:', err);
        next(new ErrorResponse('Could not export complaints', 500));
    }
});


/**
 * ADMIN UTILITY ROUTES
 */

// @desc    Generate a new invite code
// @route   POST /api/admin/generate-invite
// @access  Private (Admin only)
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
            message: 'Invite code generated successfully!',
            data: {
                code: newInvite.code,
                expiresAt,
                createdBy: req.user.id
            }
        });
    } catch (err) {
        console.error('Error generating invite code:', err);
        next(new ErrorResponse('Failed to generate invite code', 500));
    }
});


module.exports = router;