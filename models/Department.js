const mongoose = require('mongoose');

/**
 * Department Schema for Complaint Management System (Kakamega County)
 * Defines the structure for departments in Kakamega County government.
 * Each department represents a functional unit responsible for specific devolved services.
 */
const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Department name is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Department name must be at least 3 characters'],
    maxlength: [100, 'Department name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Reference to staff users assigned to this department
  staff: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Reference to complaints assigned to this department
  complaints: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint'
  }]
});

// Index for faster queries
departmentSchema.index({ name: 1 });

// Ensure unique department names are case-insensitive
departmentSchema.pre('save', async function(next) {
  const existingDepartment = await this.constructor.findOne({
    name: new RegExp(`^${this.name}$`, 'i')
  });
  if (existingDepartment && !existingDepartment._id.equals(this._id)) {
    return next(new Error('Department name already exists (case-insensitive)'));
  }
  next();
});

module.exports = mongoose.model('Department', departmentSchema);