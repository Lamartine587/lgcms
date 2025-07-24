// models/Complaint.js
const mongoose = require('mongoose');

const complaintSchema = mongoose.Schema({
    citizen: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User' // Reference to the User model
    },
    category: {
        type: String,
        required: true,
        enum: [
            'sanitation',
            'water',
            'roads',
            'corruption',
            'harassment',
            'environment',
            'other'
        ]
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String, // Could be more specific (e.g., GeoJSON for coordinates)
        required: true
    },
    evidence: [
        {
            type: String // URLs to uploaded files (photos, videos, documents)
        }
    ],
    status: {
        type: String,
        enum: ['Submitted', 'In Review', 'Resolved', 'Rejected'],
        default: 'Submitted'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Could be assigned to a sub-county admin
    },
    resolutionDetails: {
        type: String
    },
    feedback: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            text: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update `updatedAt` field on every save
complaintSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = Complaint;