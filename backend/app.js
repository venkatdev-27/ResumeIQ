const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const authRoutes = require('./routes/auth.routes');
const resumeRoutes = require('./routes/resume.routes');
const atsRoutes = require('./routes/ats.routes');
const aiRoutes = require('./routes/ai.routes');

const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');
const apiLimiter = require('./middlewares/rateLimit.middleware');

const app = express();

const JSON_BODY_LIMIT_MB = Number(process.env.MAX_JSON_BODY_MB || 10);
const jsonLimit = `${Number.isFinite(JSON_BODY_LIMIT_MB) && JSON_BODY_LIMIT_MB > 0 ? JSON_BODY_LIMIT_MB : 10}mb`;

app.set('trust proxy', 1);

app.use(helmet());
app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonLimit }));

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost',
    'https://resumeiq-2k2r.onrender.com',
    process.env.CLIENT_ORIGIN,
].filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(null, false);
        },
        credentials: true,
    }),
);

if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

app.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running',
    });
});

app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'OK' });
});

app.get('/api/test', (_req, res) => {
    res.status(200).json({
        message: 'API is working correctly',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/ats', atsRoutes);
app.use('/api/ai', aiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
