const { AppError } = require('../utils/response');

const REQUIRED_KEYS = [
    'PORT',
    'JWT_SECRET',
    'OPENROUTER_API_KEY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
];

const normalizeMongoUri = () => {
    const mongoUri = String(process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();

    if (mongoUri && !process.env.MONGODB_URI) {
        process.env.MONGODB_URI = mongoUri;
    }
    if (mongoUri && !process.env.MONGO_URI) {
        process.env.MONGO_URI = mongoUri;
    }

    return mongoUri;
};

const validateEnv = ({ strict = false } = {}) => {
    const missing = [];
    const warnings = [];

    const mongoUri = normalizeMongoUri();
    if (!mongoUri) {
        missing.push('MONGO_URI');
    }

    for (const key of REQUIRED_KEYS) {
        if (!String(process.env[key] || '').trim()) {
            missing.push(key);
        }
    }

    const port = Number(process.env.PORT || 0);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        missing.push('PORT');
    }

    if (!process.env.AI_MODEL) {
        warnings.push('AI_MODEL is not set. Default model fallback will be used.');
    }

    if (!process.env.MAX_PDF_SIZE_MB) {
        warnings.push('MAX_PDF_SIZE_MB is not set. Default 5MB limit will be used.');
    }

    const uniqueMissing = [...new Set(missing)];
    const result = {
        ok: uniqueMissing.length === 0,
        missing: uniqueMissing,
        warnings,
    };

    if (strict && !result.ok) {
        throw new AppError(
            `Missing required environment variables: ${result.missing.join(', ')}`,
            500,
            result.missing,
        );
    }

    return result;
};

const getMongoUri = () => String(process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();

module.exports = {
    validateEnv,
    getMongoUri,
};
