const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { authenticate, authorize, optionalAuthenticate } = require('../middleware/authMiddleware');
const ErrorResponse = require('../utils/ErrorResponse');
// Removed: const uploadMiddleware = require('../middleware/uploadMiddleware'); // Removed as requested

// @desc    Submit an anonymous complaint
// @route   POST /api/complaints/anonymous
// @access  Public
router.post(
  '/anonymous',
  // Removed: uploadMiddleware.fields([...]), // Removed as uploadMiddleware is no longer available
  async (req, res, next) => {
    try {
      // Data is expected to be JSON from frontend now, parsed by express.json()
      // Note: If frontend sends FormData, express.json/urlencoded might not parse it.
      // You might need to adjust frontend to send JSON if no file uploads are expected.
      const title = req.body.title;
      const description = req.body.description;
      const category = req.body.category;
      const locationText = req.body.locationText;

      if (!title || !description || !category || !locationText) {
        return next(new ErrorResponse('All required fields must be filled', 400));
      }

      // File processing removed as uploadMiddleware is removed
      const evidenceImages = [];
      const evidenceVideos = [];
      const evidenceDocuments = [];

      const location = {
        type: 'Point',
        coordinates: [0, 0],
        address: locationText
      };

      if (locationText.includes(',')) {
        const coords = locationText.split(',').map(Number);
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          location.coordinates = [coords[1], coords[0]];
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

// @desc    Submit a new complaint (for logged-in users, or can be anonymous via /complaints route in server.js)
// @route   POST /api/complaints
// @access  Public (can be submitted by logged-in user)
router.post(
    '/', // This route becomes /api/complaints when mounted in server.js
    optionalAuthenticate, // Allows both logged-in and anonymous submissions
    // Removed: uploadMiddleware.fields([...]), // Removed as uploadMiddleware is no longer available
    async (req, res, next) => {
        try {
            // Data is expected to be JSON from frontend now, parsed by express.json()
            const title = req.body.title;
            const description = req.body.description;
            const category = req.body.category;
            const locationText = req.body.locationText;

            if (!title || !description || !category || !locationText) {
                return next(new ErrorResponse('All required fields must be filled', 400));
            }

            // File processing removed as uploadMiddleware is removed
            const evidenceImages = [];
            const evidenceVideos = [];
            const evidenceDocuments = [];

            const location = {
                type: 'Point',
                coordinates: [0, 0],
                address: locationText
            };

            if (locationText.includes(',')) {
                const coords = locationText.split(',').map(Number);
                if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                    location.coordinates = [coords[1], coords[0]];
                }
            }

            const newComplaint = await Complaint.create({
                user: req.user?.id, // Will be undefined for anonymous, set for authenticated
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

// @desc    Get a single complaint by ID
// @route   GET /api/complaints/:id
// @access  Private (Admin/Staff/Citizen if authorized)
router.get('/:id', authenticate, async (req, res, next) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate('user', 'name email')
            .populate('assignedTo', 'name email');

        if (!complaint) {
            return next(new ErrorResponse(`Complaint not found with id of ${req.params.id}`, 404));
        }

        // Authorization check: Admin/Staff can see any, Citizen can only see their own
        if (req.user.role === 'citizen' && complaint.user.toString() !== req.user.id) {
            return next(new ErrorResponse('Not authorized to view this complaint', 403));
        }

        res.status(200).json({
            success: true,
            data: complaint
        });
    } catch (err) {
        console.error('Error fetching single complaint:', err);
        next(new ErrorResponse('Error fetching complaint', 500));
    }
});

// @desc    Update complaint status
// @route   PUT /api/complaints/:id/status
// @access  Private (Admin, Staff)
router.put('/:id/status', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    try {
        const { status } = req.body;

        if (!status) {
            return next(new ErrorResponse('Please provide a status', 400));
        }

        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return next(new ErrorResponse(`Complaint not found with id of ${req.params.id}`, 404));
        }

        // Staff can only update complaints assigned to them
        if (req.user.role === 'staff' && complaint.assignedTo && complaint.assignedTo.toString() !== req.user.id) {
            return next(new ErrorResponse('Not authorized to update this complaint', 403));
        }

        complaint.status = status;
        await complaint.save();

        res.status(200).json({
            success: true,
            message: 'Complaint status updated successfully',
            data: complaint
        });

    } catch (err) {
        console.error('Error updating complaint status:', err);
        next(new ErrorResponse('Error updating complaint status', 500));
    }
});

// @desc    Delete a complaint
// @route   DELETE /api/complaints/:id
// @access  Private (Admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const complaint = await Complaint.findByIdAndDelete(req.params.id);

        if (!complaint) {
            return next(new ErrorResponse(`Complaint not found with id of ${req.params.id}`, 404));
        }

        // Optionally, delete associated files from 'uploads' directory
        // This requires fs.unlink and path.resolve, be careful with production setup
        // For simplicity, this example doesn't include file deletion logic here.

        res.status(200).json({
            success: true,
            message: 'Complaint deleted successfully',
            data: {}
        });
    } catch (err) {
        console.error('Error deleting complaint:', err);
        next(new Error(ErrorResponse('Error deleting complaint', 500))); // Changed to use ErrorResponse
    }
});

module.exports = router;
