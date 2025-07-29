require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const securityMiddleware = require('./middleware/security');
const expressRateLimit = require('express-rate-limit');

const app = express();

connectDB();

securityMiddleware(app);

app.use(morgan('dev'));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

// Corrected: Mount citizen user routes at /api/citizen to match auth.js
app.use('/api/citizen', require('./routes/userRoutes')); 
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));

app.get(['/', '/login', '/register'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});
app.get('/admin/manage-users.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'manage-users.html'));
});
app.get('/admin/manage-complaints.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'manage-complaints.html'));
});
app.get('/admin/reports.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'reports.html'));
});
app.get('/admin/settings.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'settings.html'));
});
app.get('/admin/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});
app.get('/admin/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'register.html'));
});

// Specific routes for citizen HTML pages
app.get('/citizen/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'citizen', 'login.html'));
});
app.get('/citizen/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'citizen', 'register.html'));
});


app.use(notFound);
app.use(errorHandler);

exports.authLimiter = expressRateLimit({
  windowMs: 2 * 60 * 60 * 1000,
  max: 1000,
  message: 'Too many login attempts, please try again later'
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
