const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('Missing MongoDB connection string. Set MONGODB_URI in .env');
        }

        const connection = await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            minPoolSize: 1,
            serverSelectionTimeoutMS: 10000,
        });

        if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.log(`MongoDB connected: ${connection.connection.host}`);
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`MongoDB connection failed: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
