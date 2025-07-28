const mongoose = require('mongoose');

const complaintSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            required: true,
            default: 'Pending',
            enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
        },
        // New fields for evidence
        evidenceImages: [
            {
                type: String, // Stores URL to the image
            },
        ],
        evidenceVideos: [
            {
                type: String, // Stores URL to the video
            },
        ],
        evidencePdfs: [
            {
                type: String, // Stores URL to the PDF
            },
        ],
        // New field for admin feedback
        adminFeedback: {
            type: String,
            required: false, // Admin feedback is optional
        },
    },
    {
        timestamps: true,
    }
);

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;