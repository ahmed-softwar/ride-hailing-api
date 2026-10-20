
const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
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

const createTripValidation = [
    body().custom(value => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Request body must be a JSON object');
        }

        const allowedFields = [
            'pickup_latitude',
            'pickup_longitude',
            'destination_latitude',
            'destination_longitude'
        ];

        const invalidFields = Object.keys(value).filter(
            field => !allowedFields.includes(field)
        );

        if (invalidFields.length > 0) {
            throw new Error(
                `Fields not allowed: ${invalidFields.join(', ')}`
            );
        }

        return true;
    }),

    body('pickup_latitude')
        .notEmpty().withMessage('Pickup latitude is required')
        .bail()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Pickup latitude must be between -90 and 90'),

    body('pickup_longitude')
        .notEmpty().withMessage('Pickup longitude is required')
        .bail()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Pickup longitude must be between -180 and 180'),

    body('destination_latitude')
        .notEmpty().withMessage('Destination latitude is required')
        .bail()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Destination latitude must be between -90 and 90'),

    body('destination_longitude')
        .notEmpty().withMessage('Destination longitude is required')
        .bail()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Destination longitude must be between -180 and 180'),

    validate
];

const tripIdValidation = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('Trip ID must be a positive integer'),

    validate
];

const tripsListValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

    validate
];

module.exports = {
    createTripValidation,
    tripIdValidation,
    tripsListValidation
};
