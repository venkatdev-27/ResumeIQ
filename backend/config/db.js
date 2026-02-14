const mongoose = require('mongoose');
const { AppError } = require('../utils/response');
const { getMongoUri } = require('./validateEnv');

let isConnecting = false;

mongoose.connection.on('error', (error) => {
    // eslint-disable-next-line no-console
    console.error(`MongoDB connection error: ${error.message}`);
});

mongoose.connection.on('disconnected', () => {
    // eslint-disable-next-line no-console
    console.warn('MongoDB disconnected.');
});

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return true;
    }

    if (isConnecting) {
        return false;
    }

    isConnecting = true;

    try {
        const mongoUri = getMongoUri();
        if (!mongoUri) {
            throw new AppError('MongoDB connection string is not configured. Set MONGO_URI or MONGODB_URI.', 500);
        }

        const connection = await mongoose.connect(mongoUri, {
            maxPoolSize: 10,
            minPoolSize: 1,
            serverSelectionTimeoutMS: 10000,
        });

        if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.log(`MongoDB connected: ${connection.connection.host}`);
        }

        return true;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`MongoDB connection failed: ${error.message}`);
        return false;
    } finally {
        isConnecting = false;
    }
};

module.exports = connectDB;
