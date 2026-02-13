const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const { AppError, asyncHandler, sendSuccess } = require('../utils/response');

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) {
        throw new AppError('JWT secret is not configured.', 500);
    }

    return process.env.JWT_SECRET;
};

const signToken = (userId) =>
    jwt.sign({ userId }, getJwtSecret(), {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

const register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new AppError('Email is already registered.', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
    });

    const token = signToken(user._id.toString());

    return sendSuccess(
        res,
        {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        },
        'Registration successful',
        201,
    );
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        throw new AppError('Invalid email or password.', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new AppError('Invalid email or password.', 401);
    }

    const token = signToken(user._id.toString());

    return sendSuccess(
        res,
        {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        },
        'Login successful',
        200,
    );
});

const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).lean();
    if (!user) {
        throw new AppError('User not found.', 404);
    }

    return sendSuccess(
        res,
        {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        },
        'Profile fetched',
        200,
    );
});

module.exports = {
    register,
    login,
    getMe,
};
