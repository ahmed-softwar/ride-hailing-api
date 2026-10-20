
const express = require('express');

const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const {
    createTrip,
    getMyTrips,
    getTripById,
    acceptTrip,
    startTrip,
    completeTrip,
    cancelTrip
} = require('../controllers/tripController');

const {
    createTripValidation,
    tripIdValidation,
    tripsListValidation
} = require('../validations/tripValidation');

// All trip routes require authentication
router.use(authMiddleware);

// Create a trip
router.post(
    '/',
    roleMiddleware('rider'),
    createTripValidation,
    createTrip
);

// Get the logged-in user's trips
router.get(
    '/',
    tripsListValidation,
    getMyTrips
);

// Get one trip
router.get(
    '/:id',
    tripIdValidation,
    getTripById
);

// Accept a requested trip
router.patch(
    '/:id/accept',
    tripIdValidation,
    roleMiddleware('driver'),
    acceptTrip
);

// Start an accepted trip
router.patch(
    '/:id/start',
    tripIdValidation,
    roleMiddleware('driver'),
    startTrip
);

// Complete a trip in progress
router.patch(
    '/:id/complete',
    tripIdValidation,
    roleMiddleware('driver'),
    completeTrip
);

// Cancel a trip
router.patch(
    '/:id/cancel',
    tripIdValidation,
    cancelTrip
);

module.exports = router;
