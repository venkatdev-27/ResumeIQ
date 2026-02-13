const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/response');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
        sendError(res, 'Too many requests. Please try again in a few minutes.', 429);
    },
});

module.exports = apiLimiter;
