// models/Complaint.js
const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    title: { type: String, required: true }, // This maps to description from frontend
    description: { type: String, required: true }, // This maps to category from frontend
    category: { type: String, required: true }, // This maps to title from frontend
    status: { 
        type: String, 
        enum: ['pending', 'in_progress', 'resolved'], 
        default: 'pending' 
    },
    response: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Changed to default: null for optional anonymous submissions
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    // ADDED LOCATION FIELD
    location: {
        type: {
            type: String,
            enum: ['Point', 'Text'], // 'Point' for GPS, 'Text' for manual location text
            required: true // Location is required for a complaint
        },
        coordinates: { // For 'Point' type (GPS)
            type: [Number], // [longitude, latitude]
            index: '2dsphere' // Geospatial index for efficient location queries
        },
        text: { // For 'Text' type or descriptive text for Point
            type: String,
            maxlength: [200, 'Location text cannot be more than 200 characters']
        }
    },
    // If you also want to save evidence files, uncomment these lines:
    // evidenceImages: [String], // Array of file paths
    // evidenceVideos: [String], // Array of file paths
    // evidencePdfs: [String],   // Array of file paths
});

// Update the updatedAt field before saving
complaintSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Complaint', complaintSchema);
