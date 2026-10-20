
const { body, validationResult } = require('express-validator');

const validateAuth = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg
            }))
        });
    }

    return next();
};

const registerValidation = [
    body('full_name')
        .trim()
        .notEmpty()
        .withMessage('Full name is required')
        .isLength({ max: 100 })
        .withMessage('Full name must not exceed 100 characters'),

    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Enter a valid email')
        .normalizeEmail(),

    body('password')
        .isString()
        .withMessage('Password must be a string')
        .bail()
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),

    body('role')
        .optional()
        .isIn(['rider', 'driver'])
        .withMessage('Role must be rider or driver'),

    validateAuth
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Enter a valid email')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required'),

    validateAuth
];

module.exports = {
    registerValidation,
    loginValidation
};
