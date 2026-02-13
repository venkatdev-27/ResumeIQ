const multer = require('multer');
const { AppError, sendError } = require('../utils/response');

const notFoundHandler = (req, _res, next) => {
    next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

const errorHandler = (error, _req, res, _next) => {
    let normalizedError = error;

    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            normalizedError = new AppError('File size must be less than or equal to 2MB.', 413);
        } else {
            normalizedError = new AppError(error.message, 400);
        }
    }

    const statusCode = normalizedError.statusCode || 500;
    const payload = {};

    if (normalizedError.details) {
        payload.details = normalizedError.details;
    }

    if (process.env.NODE_ENV !== 'production' && error.stack) {
        payload.stack = normalizedError.stack;
    }

    return sendError(res, normalizedError.message || 'Internal server error', statusCode, payload);
};

module.exports = {
    notFoundHandler,
    errorHandler,
};
