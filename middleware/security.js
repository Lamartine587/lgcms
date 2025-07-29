const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

module.exports = (app) => {
    // Security headers
    app.use(helmet());

    // CORS
    app.use(cors({
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true
    }));

    // Data sanitization against NoSQL injection
    app.use(mongoSanitize());

    // Data sanitization against XSS
    app.use(xss());

    // Prevent parameter pollution
    app.use(hpp());

    // Rate limiting
    app.use(rateLimit({
        windowMs: 12 * 60 * 60 * 1000, // 2 hours in milliseconds
        max: 1000 // limit each IP to 100 requests per windowMs
    }));
};
