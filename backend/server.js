const dotenv = require('dotenv');
const mongoose = require('mongoose');

const { validateEnv } = require('./config/validateEnv');
const connectDB = require('./config/db');
const app = require('./app');

dotenv.config();

const DB_RETRY_INTERVAL_MS = 30_000;

const setupProcessErrorHandlers = () => {
    process.on('unhandledRejection', (reason) => {
        // eslint-disable-next-line no-console
        console.error('Unhandled promise rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
        // eslint-disable-next-line no-console
        console.error('Uncaught exception:', error);
    });
};

const scheduleDbReconnect = () => {
    const timer = setInterval(async () => {
        if (mongoose.connection.readyState !== 1) {
            await connectDB().catch(() => false);
        }
    }, DB_RETRY_INTERVAL_MS);

    timer.unref();
};

const startServer = async () => {
    setupProcessErrorHandlers();

    const envState = validateEnv({ strict: false });
    if (!envState.ok) {
        // eslint-disable-next-line no-console
        console.error(`Environment validation warnings (non-fatal): ${envState.missing.join(', ')}`);
    }

    if (envState.warnings.length) {
        // eslint-disable-next-line no-console
        console.warn(envState.warnings.join(' | '));
    }

    await connectDB();
    scheduleDbReconnect();

    const port = Number(process.env.PORT) || 5000;
    app.listen(port, '0.0.0.0', () => {
        // eslint-disable-next-line no-console
        console.log(`Server running on port ${port}`);
    });
};

startServer().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error.message);
});
