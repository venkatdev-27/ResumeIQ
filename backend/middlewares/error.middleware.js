const multer = require('multer');
const { AppError, sendError } = require('../utils/response');

const notFoundHandler = (req, _res, next) => {
    next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

const mapErrorToAppError = (error) => {
    const maxPdfSizeMb = Number(process.env.MAX_PDF_SIZE_MB || 5);

    if (error instanceof AppError) {
        return error;
    }

    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return new AppError(`File size must be less than or equal to ${maxPdfSizeMb}MB.`, 413);
        }
        return new AppError(error.message || 'File upload error.', 400);
    }

    if (error?.name === 'ValidationError') {
        const messages = Object.values(error.errors || {}).map((item) => item?.message).filter(Boolean);
        return new AppError(messages.join(', ') || 'Validation failed.', 400, messages);
    }

    if (error?.name === 'CastError') {
        return new AppError(`Invalid ${error.path || 'value'}.`, 400);
    }

    if (error?.name === 'MongoServerError' && Number(error.code) === 11000) {
        const keys = Object.keys(error.keyValue || {});
        return new AppError(`Duplicate value for: ${keys.join(', ') || 'unique field'}.`, 409);
    }

    if (error?.type === 'entity.too.large') {
        return new AppError('Request payload is too large.', 413);
    }

    if (error instanceof SyntaxError && error.status === 400 && Object.prototype.hasOwnProperty.call(error, 'body')) {
        return new AppError('Invalid JSON payload.', 400);
    }

    return new AppError(error?.message || 'Internal server error', 500);
};

const errorHandler = (error, _req, res, _next) => {
    const appError = mapErrorToAppError(error);
    const payload = {};

    if (appError.details) {
        payload.details = appError.details;
    }

    if (process.env.NODE_ENV !== 'production') {
        payload.stack = error?.stack || appError.stack;
    }

    return sendError(res, appError.message, appError.statusCode || 500, payload);
};

module.exports = {
    notFoundHandler,
    errorHandler,
};
