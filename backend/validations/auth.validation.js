const Joi = require('joi');
const { AppError } = require('../utils/response');

const registerSchema = Joi.object({
    name: Joi.string().trim().min(2).max(80).required(),
    email: Joi.string().trim().email().required(),
    password: Joi.string()
        .min(6)
        .max(128)
        .pattern(/\d/, 'at least one number')
        .required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
});

const loginSchema = Joi.object({
    email: Joi.string().trim().email().required(),
    password: Joi.string().min(1).required(),
});

const validateBody = (schema) => (req, _res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        const details = error.details.map((item) => item.message);
        return next(
            new AppError(
                details.join(', '),
                400,
                details,
            ),
        );
    }

    req.body = value;
    return next();
};

const validateRegister = validateBody(registerSchema);
const validateLogin = validateBody(loginSchema);

module.exports = {
    validateRegister,
    validateLogin,
};
