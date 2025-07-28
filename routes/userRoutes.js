const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h',
    });
};

router.post('/register', [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, username, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    try {
        const user = await User.create({
            fullName,
            username,
            email,
            password,
            phone: req.body.phone || null,
            gender: req.body.gender || null,
            dob: req.body.dob || null,
            nationality: req.body.nationality || null,
            identification: req.body.identification || null,
            occupation: req.body.occupation || null,
            county: req.body.county || null,
            department: req.body.department || null,
            office: req.body.office || null,
        });

        res.status(201).json({
            _id: user._id,
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Error during user registration:', error);
        res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
});

router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Error during user login:', error);
        res.status(500).json({ message: 'Server error during login', error: error.message });
    }
});

router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (user) {
            res.json({
                _id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                phone: user.phone,
                gender: user.gender,
                dob: user.dob,
                nationality: user.nationality,
                identification: user.identification,
                occupation: user.occupation,
                county: user.county,
                department: user.department,
                office: user.office,
                role: user.role,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error fetching profile', error: error.message });
    }
});

router.put('/profile', [
    body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
    body('username').optional().trim().notEmpty().withMessage('Username cannot be empty'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], protect, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.fullName = req.body.fullName; // No || user.fullName here to ensure update
            user.username = req.body.username; // No || user.username here to ensure update
            // email is readonly on frontend, so it won't be in req.body for update
            // user.email = req.body.email || user.email; // Keep existing email

            user.phone = req.body.phone;
            user.gender = req.body.gender;
            user.dob = req.body.dob;
            user.nationality = req.body.nationality;
            user.identification = req.body.identification;
            user.occupation = req.body.occupation;
            user.county = req.body.county;
            user.department = req.body.department;
            user.office = req.body.office;

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save(); // This is where Mongoose validation errors occur

            res.json({
                _id: updatedUser._id,
                fullName: updatedUser.fullName,
                username: updatedUser.username,
                email: updatedUser.email,
                phone: updatedUser.phone,
                gender: updatedUser.gender,
                dob: updatedUser.dob,
                nationality: updatedUser.nationality,
                identification: updatedUser.identification,
                occupation: updatedUser.occupation,
                county: updatedUser.county,
                department: updatedUser.department,
                office: updatedUser.office,
                role: updatedUser.role,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error updating user profile:', error); // DEBUG: Log backend error
        // More specific error handling for Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Server error updating profile', error: error.message });
    }
});

module.exports = router;