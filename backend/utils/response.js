class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

const asyncHandler = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

const sendSuccess = (res, data = {}, message = 'Success', statusCode = 200) =>
    res.status(statusCode).json({
        success: true,
        message,
        data,
    });

const sendError = (res, message = 'Something went wrong', statusCode = 500, extra = {}) =>
    res.status(statusCode).json({
        success: false,
        message,
        ...extra,
    });

module.exports = {
    AppError,
    asyncHandler,
    sendSuccess,
    sendError,
};
