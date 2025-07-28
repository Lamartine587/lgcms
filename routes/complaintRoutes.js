const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect, authorizeAdmin } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');

router.post('/', [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
], protect, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { title, description, evidenceImages, evidenceVideos, evidencePdfs } = req.body; // Added evidence fields

    const complaint = new Complaint({
        user: req.user._id,
        title,
        description,
        evidenceImages: evidenceImages || [], // Save if provided
        evidenceVideos: evidenceVideos || [],
        evidencePdfs: evidencePdfs || [],
    });

    try {
        const createdComplaint = await complaint.save();
        res.status(201).json(createdComplaint);
    } catch (error) {
        console.error('Error creating complaint:', error);
        res.status(400).json({ message: 'Failed to create complaint', error: error.message });
    }
});

router.get('/', protect, async (req, res) => {
    try {
        const complaints = await Complaint.find({ user: req.user._id });
        res.json(complaints);
    } catch (error) {
        console.error('Error fetching user complaints:', error);
        res.status(500).json({ message: 'Server error fetching complaints', error: error.message });
    }
});

router.get('/all', protect, authorizeAdmin, async (req, res) => {
    try {
        // Populate user details, and include all new fields
        const complaints = await Complaint.find({})
            .populate('user', 'username fullName email')
            .select('-password'); // Exclude password from user object
        res.json(complaints);
    } catch (error) {
        console.error('Error fetching all complaints for admin:', error);
        res.status(500).json({ message: 'Server error fetching all complaints', error: error.message });
    }
});

router.get('/statistics', protect, authorizeAdmin, async (req, res) => {
    try {
        // Ensure these status strings exactly match your Complaint model's enum values
        const totalComplaints = await Complaint.countDocuments({});
        const pendingComplaints = await Complaint.countDocuments({ status: 'Pending' });
        const inProgressComplaints = await Complaint.countDocuments({ status: 'In Progress' });
        const resolvedComplaints = await Complaint.countDocuments({ status: 'Resolved' });
        const rejectedComplaints = await Complaint.countDocuments({ status: 'Rejected' });

        res.json({
            total: totalComplaints,
            pending: pendingComplaints,
            inProgress: inProgressComplaints,
            resolved: resolvedComplaints,
            rejected: rejectedComplaints,
        });
    } catch (error) {
        console.error('Error fetching complaint statistics:', error);
        res.status(500).json({ message: 'Server error fetching statistics', error: error.message });
    }
});

router.get('/:id', protect, async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id).populate('user', 'username fullName email'); // Populate user data
        if (complaint && (complaint.user._id.toString() === req.user._id.toString() || req.user.role === 'admin')) {
            res.json(complaint);
        } else {
            res.status(404).json({ message: 'Complaint not found or unauthorized' });
        }
    } catch (error) {
        console.error('Error fetching single complaint:', error);
        res.status(500).json({ message: 'Server error fetching complaint', error: error.message });
    }
});

router.put('/:id', [
    body('status').optional().isIn(['Pending', 'In Progress', 'Resolved', 'Rejected']).withMessage('Invalid status'),
    body('adminFeedback').optional().isString(),
], protect, authorizeAdmin, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { status, adminFeedback } = req.body; // Added adminFeedback
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (complaint) {
            complaint.status = status || complaint.status;
            // Only update adminFeedback if it's explicitly provided in the request body
            if (adminFeedback !== undefined) {
                complaint.adminFeedback = adminFeedback;
            }

            const updatedComplaint = await complaint.save();
            res.json(updatedComplaint);
        } else {
            res.status(404).json({ message: 'Complaint not found' });
        }
    } catch (error) {
        console.error('Error updating complaint:', error);
        res.status(400).json({ message: 'Failed to update complaint', error: error.message });
    }
});

router.delete('/:id', protect, authorizeAdmin, async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (complaint) {
            await complaint.deleteOne();
            res.json({ message: 'Complaint removed' });
        } else {
            res.status(404).json({ message: 'Complaint not found' });
        }
    } catch (error) {
        console.error('Error deleting complaint:', error);
        res.status(500).json({ message: 'Server error deleting complaint', error: error.message });
    }
});

module.exports = router;