
const express = require('express');
const router = express.Router();

const {
    getMyProfile,
    updateMyProfile,
    changeMyPassword,
    deleteMyAccount,
    getAllUsers,
    getUserById,
    updateUserStatus
} = require('../controllers/userController');

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const {
    updateProfileValidation,
    changePasswordValidation
} = require('../validations/userValidation');

// User profile routes
router.get('/me', authMiddleware, getMyProfile);

router.patch(
    '/me',
    authMiddleware,
    updateProfileValidation,
    updateMyProfile
);

router.patch(
    '/me/password',
    authMiddleware,
    changePasswordValidation,
    changeMyPassword
);

router.delete('/me', authMiddleware, deleteMyAccount);

// Admin routes
router.get(
    '/',
    authMiddleware,
    roleMiddleware('admin'),
    getAllUsers
);

router.get(
    '/:id',
    authMiddleware,
    roleMiddleware('admin'),
    getUserById
);

router.patch(
    '/:id/status',
    authMiddleware,
    roleMiddleware('admin'),
    updateUserStatus
);

module.exports = router;
