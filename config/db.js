const mongoose = require('mongoose');

const connectDB = async () => {
    console.log('Connecting to MongoDB Atlas...');
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Connection Error: ${error.message}`);
        console.log('Troubleshooting:');
        console.log('1. Verify MONGO_URI in .env matches your Atlas connection string');
        console.log('2. Check your IP is whitelisted in MongoDB Atlas');
        console.log('3. Ensure database user has correct privileges');
        console.log('4. Ensure that you have internet connection');
        process.exit(1);
    }
};

// Connection events for better debugging
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.warn('Mongoose disconnected');
});

module.exports = connectDB;