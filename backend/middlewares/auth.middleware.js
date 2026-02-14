const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User.model');
const { AppError, asyncHandler } = require('../utils/response');

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) {
        throw new AppError('JWT secret is not configured.', 500);
    }

    return process.env.JWT_SECRET;
};

const protect = asyncHandler(async (req, _res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        throw new AppError('Authorization token is missing.', 401);
    }

    let decoded;
    const jwtSecret = getJwtSecret();
    try {
        decoded = jwt.verify(token, jwtSecret);
    } catch (_error) {
        throw new AppError('Invalid or expired token.', 401);
    }

    if (!mongoose.Types.ObjectId.isValid(decoded?.userId)) {
        throw new AppError('Invalid token user.', 401);
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
        throw new AppError('Invalid token user.', 401);
    }

    req.user = user;
    return next();
});

const authorize = (...roles) => (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return next(new AppError('You do not have permission to access this resource.', 403));
    }
    return next();
};

module.exports = {
    protect,
    authorize,
};
