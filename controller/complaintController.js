// Example: controllers/complaintController.js (simplified)

const Complaint = require('../models/Complaint'); // Assuming your Mongoose model
const User = require('../models/User'); // Assuming your User model for assignment

exports.updateComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, priority, assignedTo, responseText } = req.body; // Data from frontend
        const adminId = req.user.id; // Assuming admin ID is set by auth middleware
        const adminUsername = req.user.username; // Assuming admin username is set by auth middleware

        // 1. Find the complaint
        const complaint = await Complaint.findById(id);

        if (!complaint) {
            return res.status(404).json({ success: false, message: 'Complaint not found.' });
        }

        // 2. Apply updates
        if (status && complaint.status !== status) {
            complaint.status = status;
            // If status is resolved, set resolvedAt
            if (status === 'Resolved' && !complaint.resolvedAt) {
                complaint.resolvedAt = new Date();
            } else if (status !== 'Resolved' && complaint.resolvedAt) {
                // If status changes from resolved, clear resolvedAt
                complaint.resolvedAt = undefined;
            }
        }
        if (priority && complaint.priority !== priority) {
            complaint.priority = priority;
        }

        // Handle assignedTo update
        if (assignedTo !== undefined) { // Check if assignedTo was sent (could be null for unassign)
            if (assignedTo === null || assignedTo === '') {
                // Unassign
                complaint.assignedTo = undefined;
            } else if (complaint.assignedTo?.toString() !== assignedTo) {
                // Assign to a new staff if different
                const staffUser = await User.findById(assignedTo);
                if (!staffUser || staffUser.role !== 'staff') { // Ensure it's a valid staff user
                    return res.status(400).json({ success: false, message: 'Invalid staff user ID for assignment.' });
                }
                complaint.assignedTo = assignedTo;
            }
        }


        // Handle response text
        if (responseText) {
            if (!complaint.responseHistory) {
                complaint.responseHistory = [];
            }
            complaint.responseHistory.push({
                responder: adminUsername, // Or req.user.username from JWT
                text: responseText,
                timestamp: new Date()
            });
        }

        // 3. Save the updated complaint
        await complaint.save();

        res.status(200).json({ success: true, message: 'Complaint updated successfully.', data: complaint });

    } catch (error) {
        console.error('Error updating complaint:', error); // THIS IS WHAT YOU NEED TO CHECK IN YOUR SERVER LOGS
        res.status(500).json({ success: false, message: 'Could not update complaint.', error: error.message });
    }
};