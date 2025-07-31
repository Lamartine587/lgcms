const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { authenticate, authorize, optionalAuthenticate } = require('../middleware/authMiddleware');
const ErrorResponse = require('../utils/ErrorResponse');
const multer = require('multer');
const path = require('path');

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new ErrorResponse('Only images, videos, and PDFs are allowed!', 400), false);
    }
};

// Initialize multer middleware correctly
const uploadMiddleware = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 50 }, // 50MB
    fileFilter: fileFilter
});

// @desc    Submit an anonymous complaint
// @route   POST /api/complaints/anonymous
// @access  Public
router.post(
  '/anonymous',
  uploadMiddleware.fields([
    { name: 'evidenceImages', maxCount: 5 },
    { name: 'evidenceVideos', maxCount: 2 },
    { name: 'evidenceDocuments', maxCount: 3 }
  ]),
  async (req, res, next) => {
    try {
      // Process form data (similar to your regular complaint route)
      const title = Array.isArray(req.body.title) ? req.body.title[0] : req.body.title;
      const description = Array.isArray(req.body.description) ? req.body.description[0] : req.body.description;
      const category = Array.isArray(req.body.category) ? req.body.category[0] : req.body.category;
      const locationText = Array.isArray(req.body.locationText) ? req.body.locationText[0] : req.body.locationText;

      // Validate required fields
      if (!title || !description || !category || !locationText) {
        return next(new ErrorResponse('All required fields must be filled', 400));
      }

      // Process files
      const evidenceImages = req.files?.evidenceImages?.map(file => file.path) || [];
      const evidenceVideos = req.files?.evidenceVideos?.map(file => file.path) || [];
      const evidenceDocuments = req.files?.evidenceDocuments?.map(file => file.path) || [];

      // Create location object
      const location = {
        type: 'Point',
        coordinates: [0, 0], // Default coordinates
        address: locationText
      };

      // Try to parse coordinates if provided
      if (locationText.includes(',')) {
        const coords = locationText.split(',').map(Number);
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          location.coordinates = [coords[1], coords[0]]; // [lng, lat]
        }
      }

      const newComplaint = await Complaint.create({
        title,
        description,
        category,
        location,
        evidenceImages,
        evidenceVideos,
        evidenceDocuments,
        isAnonymous: true
      });

      res.status(201).json({
        success: true,
        message: 'Anonymous complaint submitted successfully!',
        data: newComplaint
      });

    } catch (err) {
      console.error('Anonymous complaint submission error:', err);
      if (err.name === 'ValidationError') {
        return next(new ErrorResponse(Object.values(err.errors).map(e => e.message).join(', '), 400));
      }
      next(new ErrorResponse('Anonymous complaint submission failed', 500));
    }
  }
);

// @desc    Get complaints assigned to staff member
// @route   GET /api/complaints/assigned
// @access  Private (Staff)
router.get('/assigned', authenticate, authorize('staff'), async (req, res, next) => {
    try {
        const staffId = req.user.id;
        const { status } = req.query;
        
        const query = { assignedTo: staffId };
        if (status) query.status = status;

        const complaints = await Complaint.find(query)
            .sort({ createdAt: -1 })
            .populate('user', 'name email');

        res.status(200).json({
            success: true,
            data: complaints
        });
    } catch (err) {
        next(new ErrorResponse('Error fetching assigned complaints', 500));
    }
});

// @desc    Get all complaints (for admin dashboard)
// @route   GET /api/complaints
// @access  Private (Admin)
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { status, category, page = 1, limit = 10 } = req.query;
        
        const query = {};
        if (status) query.status = status;
        if (category) query.category = category;

        const complaints = await Complaint.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('user', 'name email')
            .populate('assignedTo', 'name email');

        const total = await Complaint.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                complaints,
                total,
                page: Number(page),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        next(new ErrorResponse('Error fetching complaints', 500));
    }
});

// @desc    Submit a new complaint
// @route   POST /api/complaints
// @access  Public (can be submitted anonymously or by logged-in user)
router.post(
    '/',
    optionalAuthenticate,
    uploadMiddleware.fields([
        { name: 'evidenceImages', maxCount: 5 },
        { name: 'evidenceVideos', maxCount: 2 },
        { name: 'evidenceDocuments', maxCount: 3 }
    ]),
    async (req, res, next) => {
        try {
            // Ensure we're working with string values
            const title = Array.isArray(req.body.title) ? req.body.title[0] : req.body.title;
            const description = Array.isArray(req.body.description) ? req.body.description[0] : req.body.description;
            const category = Array.isArray(req.body.category) ? req.body.category[0] : req.body.category;
            const locationText = Array.isArray(req.body.locationText) ? req.body.locationText[0] : req.body.locationText;

            // Validate required fields
            if (!title || !description || !category || !locationText) {
                return next(new ErrorResponse('All required fields must be filled', 400));
            }

            // Process files
            const evidenceImages = req.files?.evidenceImages?.map(file => file.path) || [];
            const evidenceVideos = req.files?.evidenceVideos?.map(file => file.path) || [];
            const evidenceDocuments = req.files?.evidenceDocuments?.map(file => file.path) || [];

            // Create location object
            const location = {
                type: 'Point',
                coordinates: [0, 0], // Default coordinates
                address: locationText
            };

            // Try to parse coordinates if provided
            if (locationText.includes(',')) {
                const coords = locationText.split(',').map(Number);
                if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                    location.coordinates = [coords[1], coords[0]]; // [lng, lat]
                }
            }

            const newComplaint = await Complaint.create({
                user: req.user?.id,
                title,
                description,
                category,
                location,
                evidenceImages,
                evidenceVideos,
                evidenceDocuments
            });

            res.status(201).json({
                success: true,
                message: 'Complaint submitted successfully!',
                data: newComplaint
            });

        } catch (err) {
            console.error('Complaint submission error:', err);
            if (err.name === 'ValidationError') {
                return next(new ErrorResponse(Object.values(err.errors).map(e => e.message).join(', '), 400));
            }
            next(new ErrorResponse('Complaint submission failed', 500));
        }
    }
);

// @desc    Get complaints for the logged-in citizen
// @route   GET /api/complaints/my-complaints
// @access  Private (Citizen)
router.get('/my-complaints', authenticate, authorize('citizen'), async (req, res, next) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalComplaints = await Complaint.countDocuments({ user: userId });
        const complaints = await Complaint.find({ user: userId })
                                        .sort({ createdAt: -1 })
                                        .skip(skip)
                                        .limit(limit);

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
        console.error('Error fetching user complaints:', err);
        next(new ErrorResponse('Could not fetch user complaints', 500));
    }
});

module.exports = router;