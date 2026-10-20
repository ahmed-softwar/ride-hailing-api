
const { body, validationResult } = require('express-validator');

const validateUser = (req, res, next) => {
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

const updateProfileValidation = [
    body('full_name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Full name cannot be empty')
        .isLength({ max: 100 })
        .withMessage('Full name must not exceed 100 characters'),

    body('email')
        .optional()
        .trim()
        .isEmail()
        .withMessage('Enter a valid email')
        .normalizeEmail(),

    body()
        .custom((value, { req }) => {
            if (req.body.full_name === undefined &&
                req.body.email === undefined) {
                throw new Error('Provide full_name or email to update');
            }

            return true;
        }),

    validateUser
];

const changePasswordValidation = [
    body('current_password')
        .isString()
        .withMessage('Current password must be a string')
        .bail()
        .notEmpty()
        .withMessage('Current password is required'),

    body('new_password')
        .isString()
        .withMessage('New password must be a string')
        .bail()
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters'),

    validateUser
];

module.exports = {
    updateProfileValidation,
    changePasswordValidation
};
