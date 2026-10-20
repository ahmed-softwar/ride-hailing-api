
const { body, param, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: errors.array()
        });
    }

    return next();
};

const updateDriverLocationValidation = [
    body('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90')
        .toFloat(),

    body('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180')
        .toFloat(),

    validateRequest
];

const driverIdValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Driver ID must be a positive integer'),

    validateRequest
];

module.exports = {
    updateDriverLocationValidation,
    driverIdValidation
};
