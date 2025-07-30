const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const { v4: uuidv4 } = require('uuid');

/**
 * User Schema for Complaint Management System
 * Defines the structure for user data, including citizens, admins, and staff.
 * Includes fields for authentication, roles, and department association.
 */
const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    required: true,
    default: () => uuidv4()
  },
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  avatar: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['citizen', 'admin', 'staff'],
    default: 'citizen'
  },
  fullName: String,
  phone: String,
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [function() { return this.role === 'staff'; }, 'Department is required for staff users']
  },
  bio: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster queries
userSchema.index({ userId: 1 });
userSchema.index({ email: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  console.log(`[User Model] Comparing: Candidate='${candidatePassword}' (length: ${candidatePassword.length})`);
  console.log(`[User Model] Stored Hash (partial): '${this.password.substring(0, 15)}...' (full length: ${this.password.length})`);
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  delete user.createdAt; // Exclude createdAt from API responses
  return user;
};

module.exports = mongoose.model('User', userSchema);