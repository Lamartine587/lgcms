require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const { protect } = require('./middleware/authMiddleware');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
}));

// Serve static files from the 'public' directory
// This line tells Express to look for static files (like HTML, CSS, JS)
// inside the 'public' folder. When a request comes in, it will try to
// match the path to a file in this directory.
app.use(express.static('public'));

app.use('/api/users', userRoutes);
app.use('/api/complaints', protect, complaintRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
});

app.get('/', (req, res) => {
    res.send('LGCMS API is running...');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});