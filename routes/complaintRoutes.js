const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
// IMPORTANT: Uncomment the line below and ensure you have a Complaint model defined in '../models/Complaint'
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

const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 50 }, // 50MB file size limit
    fileFilter: fileFilter
});

// @desc    Submit a new complaint
// @route   POST /api/complaints
// @access  Public (can be submitted anonymously or by logged-in user)
router.post(
    '/',
    optionalAuthenticate,
    upload.fields([
        { name: 'evidenceImages', maxCount: 5 },
        { name: 'evidenceVideos', maxCount: 2 },
        { name: 'evidencePdfs', maxCount: 1 }
    ]),
    async (req, res, next) => {
        console.log('Backend: Received Complaint Data:', req.body);
        console.log('Backend: Received Files:', req.files);

        try {
            // Frontend sends 'title' (category dropdown) and 'description' (detailed text)
            const { title: categoryFromFrontend, description: detailedDescription, locationText, latitude, longitude } = req.body;
            const userId = req.user ? req.user.id : null; 

            // Note: Your provided Complaint model schema does NOT include evidenceImages, Videos, Pdfs.
            // If you intend to store these, you must add them to your Complaint model schema.
            // For now, these will be collected but not saved to the Complaint document.
            const evidenceImages = req.files && req.files['evidenceImages'] ? req.files['evidenceImages'].map(file => file.path) : [];
            const evidenceVideos = req.files && req.files['evidenceVideos'] ? req.files['evidenceVideos'].map(file => file.path) : [];
            const evidencePdfs = req.files && req.files['evidencePdfs'] ? req.files['evidencePdfs'].map(file => file.path) : [];

            // Basic validation for required fields from the frontend
            if (!categoryFromFrontend || !detailedDescription) {
                console.log('Validation Failed: Complaint category or description missing from frontend.');
                return next(new ErrorResponse('Complaint category and description are required', 400));
            }

            // Construct location object based on frontend input
            let location = {};
            if (latitude && longitude) {
                if (latitude === "" || longitude === "") {
                    console.log('Validation Failed: GPS coordinates are empty strings.');
                    return next(new ErrorResponse('Location is required (GPS or manual input)', 400));
                }
                location = {
                    type: 'Point',
                    coordinates: [parseFloat(longitude), parseFloat(latitude)],
                    text: locationText || `Lat: ${latitude}, Lon: ${longitude}`
                };
            } else if (locationText) {
                location = {
                    type: 'Text',
                    text: locationText
                };
            } else {
                console.log('Validation Failed: No location data provided.');
                return next(new ErrorResponse('Location is required (GPS or manual input)', 400));
            }

            // Create new complaint using the Complaint model
            // Mapping frontend fields to Complaint model schema fields:
            const newComplaint = await Complaint.create({
                user: userId, // Will be null for anonymous submissions, ensure your schema handles this
                title: categoryFromFrontend, // Frontend 'title' (category) maps to model 'title'
                description: detailedDescription, // Frontend 'description' maps to model 'description'
                category: categoryFromFrontend, // Frontend 'title' (category) maps to model 'category'
                location: location, // Now saving the constructed location object
                // status defaults to 'pending' as per your schema enum
                // response is not provided by frontend
                // createdAt and updatedAt are handled by schema defaults/pre-save hook
                // evidenceImages, evidenceVideos, evidencePdfs are NOT in your provided schema
                // and will not be saved unless you add them to your Complaint model.
            });

            console.log('Complaint successfully created in DB:', newComplaint);

            res.status(201).json({
                success: true,
                message: 'Complaint submitted successfully!',
                data: newComplaint // Send the created complaint object
            });

        } catch (err) {
            console.error('Complaint submission error in handler:', err);
            // Check for Mongoose validation errors
            if (err.name === 'ValidationError') {
                const messages = Object.values(err.errors).map(val => val.message);
                return next(new ErrorResponse(messages.join(', '), 400));
            }
            if (err instanceof multer.MulterError) {
                return next(new ErrorResponse(`File upload error: ${err.message}`, 400));
            }
            next(new ErrorResponse('Complaint submission failed: ' + err.message, 500));
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

        // Fetch actual complaints for the user from the database
        const totalComplaints = await Complaint.countDocuments({ user: userId });
        const complaints = await Complaint.find({ user: userId })
                                        .sort({ createdAt: -1 }) // Sort by newest first
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

// You can add more routes here for updating, deleting, or getting single complaint details

module.exports = router;
