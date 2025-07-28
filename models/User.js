const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
        },
        username: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: false, // Made optional for registration
        },
        gender: {
            type: String,
            enum: ['Male', 'Female', 'Other'],
            required: false, // Made optional
        },
        dob: {
            type: Date,
            required: false, // Made optional
        },
        nationality: {
            type: String,
            required: false, // Made optional
        },
        identification: {
            type: String,
            required: false, // Made optional
        },
        occupation: {
            type: String,
            required: false, // Made optional
        },
        county: {
            type: String,
            required: false, // Made optional
        },
        department: {
            type: String,
            required: false, // Made optional
        },
        office: {
            type: String,
            required: false, // Made optional
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;