class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.name = 'AppError';
        this.statusCode = Number.isInteger(statusCode) ? statusCode : 500;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

const asyncHandler = (handler) => (req, res, next) =>
    Promise.resolve()
        .then(() => handler(req, res, next))
        .catch(next);

const sendSuccess = (res, data = {}, message = 'Success', statusCode = 200) =>
    res.status(statusCode).json({
        success: true,
        message,
        data,
    });

const sendError = (res, message = 'Something went wrong', statusCode = 500, extra = {}) => {
    const safeStatusCode = Number.isInteger(statusCode) ? statusCode : 500;
    const payload = {
        success: false,
        message,
    };

    if (extra && typeof extra === 'object') {
        Object.assign(payload, extra);
    }

    return res.status(safeStatusCode).json(payload);
};

module.exports = {
    AppError,
    asyncHandler,
    sendSuccess,
    sendError,
};
