const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

// Configure storage for file uploads
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|mp4|mov|pdf/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb('Error: Images/Videos/PDFs only!');
    }
}).array('evidence', 5);

// Rate limiting for anonymous complaints
const anonymousLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // limit each IP to 3 anonymous complaints per window
    message: 'Too many anonymous submissions from this IP, please try again later'
});

// Generate unique public ID for complaints
const generatePublicId = () => {
    return 'COMP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
};

// POST /api/complaints - Create new authenticated complaint
router.post('/', protect, authorizeRoles('citizen'), (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Please upload at least one evidence file.' });
        }

        const { category, description, location } = req.body;
        const evidenceUrls = req.files.map(file => `/uploads/${file.filename}`);

        try {
            const complaint = await Complaint.create({
                citizen: req.user._id,
                category,
                description,
                location,
                evidence: evidenceUrls,
                publicId: generatePublicId(),
                isAnonymous: false
            });
            res.status(201).json(complaint);
        } catch (error) {
            // Clean up uploaded files if complaint creation fails
            req.files.forEach(file => {
                fs.unlinkSync(file.path);
            });
            res.status(500).json({ message: error.message });
        }
    });
});

// POST /api/complaints/anonymous - Create anonymous complaint
router.post('/anonymous', anonymousLimiter, (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Please upload at least one evidence file.' });
        }

        const { category, description, location, contactEmail } = req.body;
        const evidenceUrls = req.files.map(file => `/uploads/${file.filename}`);

        try {
            const complaint = await Complaint.create({
                category,
                description,
                location,
                evidence: evidenceUrls,
                contactEmail: contactEmail || null,
                publicId: generatePublicId(),
                isAnonymous: true
            });
            
            res.status(201).json({
                message: 'Anonymous complaint submitted successfully',
                referenceId: complaint.publicId,
                contactEmail: !!contactEmail
            });
        } catch (error) {
            // Clean up uploaded files if complaint creation fails
            req.files.forEach(file => {
                fs.unlinkSync(file.path);
            });
            res.status(500).json({ message: error.message });
        }
    });
});

// GET /api/complaints/status/:publicId - Check complaint status (public)
router.get('/status/:publicId', async (req, res) => {
    try {
        const complaint = await Complaint.findOne({ 
            publicId: req.params.publicId 
        }).select('-citizen -assignedTo -feedback.user -__v');

        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        // Return limited information for anonymous complaints
        const response = {
            status: complaint.status,
            category: complaint.category,
            createdAt: complaint.createdAt,
            updatedAt: complaint.updatedAt,
            resolutionDetails: complaint.isAnonymous ? null : complaint.resolutionDetails
        };

        res.json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/complaints - Get all complaints (filtered by role)
router.get('/', protect, async (req, res) => {
    try {
        let complaints;
        if (req.user.role === 'citizen') {
            complaints = await Complaint.find({ citizen: req.user._id })
                .populate('citizen', 'username email');
        } else {
            complaints = await Complaint.find({})
                .populate('citizen', 'username email')
                .populate('assignedTo', 'username email');
        }
        
        // Format response to hide citizen info for anonymous complaints
        const formattedComplaints = complaints.map(c => ({
            ...c.toObject(),
            citizen: c.isAnonymous ? 'Anonymous' : c.citizen
        }));

        res.json(formattedComplaints);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/complaints/stats - Get statistics
router.get('/stats', protect, authorizeRoles('sub-county_admin', 'county_director'), async (req, res) => {
    try {
        const totalComplaints = await Complaint.countDocuments();
        const anonymousCount = await Complaint.countDocuments({ isAnonymous: true });
        const submitted = await Complaint.countDocuments({ status: 'Submitted' });
        const inReview = await Complaint.countDocuments({ status: 'In Review' });
        const resolved = await Complaint.countDocuments({ status: 'Resolved' });
        const rejected = await Complaint.countDocuments({ status: 'Rejected' });

        const mostCommonIssues = await Complaint.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            totalComplaints,
            anonymousCount,
            statusBreakdown: { submitted, inReview, resolved, rejected },
            mostCommonIssues
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/complaints/:id - Get specific complaint
router.get('/:id', protect, async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate('citizen', 'username email')
            .populate('assignedTo', 'username email')
            .populate('feedback.user', 'username email');

        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        // Hide citizen info for anonymous complaints unless admin
        if (complaint.isAnonymous && req.user.role === 'citizen') {
            return res.status(403).json({ message: 'Not authorized to view this complaint' });
        }

        const response = complaint.toObject();
        if (complaint.isAnonymous) {
            response.citizen = 'Anonymous';
        }

        res.json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/complaints/:id/status - Update complaint status
router.put('/:id/status', protect, authorizeRoles('sub-county_admin', 'county_director'), async (req, res) => {
    const { status, assignedTo, resolutionDetails } = req.body;
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        complaint.status = status || complaint.status;
        complaint.assignedTo = assignedTo || complaint.assignedTo;
        complaint.resolutionDetails = resolutionDetails || complaint.resolutionDetails;

        const updatedComplaint = await complaint.save();
        res.json(updatedComplaint);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/complaints/:id/feedback - Add feedback to complaint
router.post('/:id/feedback', protect, async (req, res) => {
    const { text } = req.body;
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        // For anonymous complaints, only allow admin feedback
        if (complaint.isAnonymous && req.user.role === 'citizen') {
            return res.status(403).json({ message: 'Not authorized to provide feedback on anonymous complaints' });
        }

        complaint.feedback.push({ user: req.user._id, text });
        const updatedComplaint = await complaint.save();
        res.status(201).json(updatedComplaint);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;