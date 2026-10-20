
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const {
    updateDriverLocation,
    getDriverLocation
} = require('../controllers/driverController');

const {
    updateDriverLocationValidation,
    driverIdValidation
} = require('../validations/driverValidation');

router.use(authMiddleware);

router.post(
    '/location',
    roleMiddleware('driver'),
    updateDriverLocationValidation,
    updateDriverLocation
);

router.get(
    '/:id/location',
    driverIdValidation,
    getDriverLocation
);

module.exports = router;
