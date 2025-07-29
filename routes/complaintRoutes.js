const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const Complaint = require('../models/Complaint');

// Create a new complaint (authenticated users only)
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, description, category } = req.body;
        
        if (!title || !description || !category) {
            return res.status(400).json({ error: 'Title, description and category are required' });
        }

        const complaint = new Complaint({
            title,
            description,
            category,
            user: req.user.id,
            status: 'pending'
        });

        await complaint.save();
        res.status(201).json(complaint);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all complaints (with user filtering)
router.get('/', authenticate, async (req, res) => {
    try {
        let query = {};
        
        // For non-admins, only show their own complaints
        if (req.user.role !== 'admin') {
            query.user = req.user.id;
        }

        const complaints = await Complaint.find(query).populate('user', 'username');
        res.json(complaints);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Other routes remain similar but add authenticate middleware
router.get('/:id', authenticate, /* ... */);
router.put('/:id', authenticate, /* ... */);
router.delete('/:id', authenticate, /* ... */);

module.exports = router;