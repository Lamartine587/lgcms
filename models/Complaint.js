// models/Complaint.js
const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({
    category: {
        type: String,
        required: [true, 'Please add a category'],
        enum: [
            'Roads', 'Water', 'Sanitation', 'Health', 'Education', 
            'Security', 'Public Safety', 'Electricity Outage', 
            'Waste Management', 'Traffic Management', 'Housing', 
            'Environment', 'Drainage Issues', 'Public Transport', 
            'Community Development', 'Other', 'Dangerous Intersection'  // Added this
        ]
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],  // Only 'Point' is allowed
            required: true
        },
        coordinates: {
            type: [Number],
            required: function() {
                return this.location.type === 'Point';
            }
        },
        address: {
            type: String,
            required: true
        }
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    category: {
        type: String,
        required: [true, 'Please add a category'],
        // FIX: Added 'Electricity Outage' to the enum for category
        enum: ['Roads', 'Water', 'Sanitation', 'Health', 'Education', 'Security', 'Other', 'Public Safety', 'Electricity Outage', 'Waste Management', 'Traffic Management', 'Housing', 'Environment', 'Drainage Issues', 'Public Transport', 'Community Development']
    },
    status: {
        type: String,
        enum: ['Pending','pending', 'In Progress', 'Resolved', 'Rejected'],
        default: 'Pending'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: 'Medium'
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        default: null
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            index: '2dsphere'
        },
        address: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    resolvedAt: Date,
    evidenceImages: [String],
evidenceVideos: [String],
evidenceDocuments: [String], // Changed from evidencePdfs
    responseHistory: [
        {
            responder: String,
            text: String,
            timestamp: {
                type: Date,
                default: Date.now
            }
        }
    ]
});

ComplaintSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'Resolved' && !this.resolvedAt) {
        this.resolvedAt = Date.now();
    } else if (this.isModified('status') && this.status !== 'Resolved' && this.resolvedAt) {
        this.resolvedAt = undefined;
    }
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Complaint', ComplaintSchema);