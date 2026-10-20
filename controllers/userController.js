
const pool = require('../config/database');
const bcrypt = require('bcrypt');

const getMyProfile = async (req, res, next) => {
    try {
        const [users] = await pool.execute(
            `SELECT id, full_name, email, role, driver_status,
                    is_active, created_at, updated_at
             FROM users
             WHERE id = ?`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        return res.status(200).json({
            message: 'Profile retrieved successfully',
            user: users[0]
        });
    } catch (error) {
        return next(error);
    }
};

const updateMyProfile = async (req, res, next) => {
    try {
        const { full_name, email } = req.body || {};

        if (full_name !== undefined && (
            typeof full_name !== 'string' || !full_name.trim()
        )) {
            return res.status(400).json({
                message: 'Full name cannot be empty'
            });
        }

        if (email !== undefined && (
            typeof email !== 'string' || !email.trim()
        )) {
            return res.status(400).json({
                message: 'Email cannot be empty'
            });
        }

        if (full_name === undefined && email === undefined) {
            return res.status(400).json({
                message: 'At least one field is required'
            });
        }

        const [users] = await pool.execute(
            'SELECT id FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        if (email !== undefined) {
            const normalizedEmail = email.trim();

            const [existingUsers] = await pool.execute(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [normalizedEmail, req.user.id]
            );

            if (existingUsers.length > 0) {
                return res.status(409).json({
                    message: 'Email already exists'
                });
            }
        }

        const fields = [];
        const values = [];

        if (full_name !== undefined) {
            fields.push('full_name = ?');
            values.push(full_name.trim());
        }

        if (email !== undefined) {
            fields.push('email = ?');
            values.push(email.trim());
        }

        values.push(req.user.id);

        await pool.execute(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        const [updatedUsers] = await pool.execute(
            `SELECT id, full_name, email, role, driver_status,
                    is_active, created_at, updated_at
             FROM users
             WHERE id = ?`,
            [req.user.id]
        );

        return res.status(200).json({
            message: 'Profile updated successfully',
            user: updatedUsers[0]
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'Email already exists'
            });
        }

        return next(error);
    }
};

const changeMyPassword = async (req, res, next) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                message: 'Current password and new password are required'
            });
        }

        if (new_password.length < 8) {
            return res.status(400).json({
                message: 'New password must be at least 8 characters'
            });
        }

        const [users] = await pool.execute(
            'SELECT id, password_hash FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const passwordMatches = await bcrypt.compare(
            current_password,
            users[0].password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: 'Current password is incorrect'
            });
        }

        const passwordHash = await bcrypt.hash(new_password, 10);

        await pool.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [passwordHash, req.user.id]
        );

        return res.status(200).json({
            message: 'Password changed successfully'
        });
    } catch (error) {
        return next(error);
    }
};

const deleteMyAccount = async (req, res, next) => {
    try {
        const [users] = await pool.execute(
            'SELECT id FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const [trips] = await pool.execute(
            `SELECT id FROM trips
             WHERE rider_id = ? OR driver_id = ?
             LIMIT 1`,
            [req.user.id, req.user.id]
        );

        if (trips.length > 0) {
            return res.status(409).json({
                message: 'Account cannot be deleted because it has trip records'
            });
        }

        await pool.execute(
            'DELETE FROM driver_locations WHERE driver_id = ?',
            [req.user.id]
        );

        await pool.execute(
            'DELETE FROM users WHERE id = ?',
            [req.user.id]
        );

        return res.status(200).json({
            message: 'Account deleted successfully'
        });
    } catch (error) {
        return next(error);
    }
};

const getAllUsers = async (req, res, next) => {
    try {
        const page = Number.parseInt(req.query.page, 10) || 1;
        const limit = Number.parseInt(req.query.limit, 10) || 10;

        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                message: 'Page must be positive and limit must be between 1 and 100'
            });
        }

        const offset = (page - 1) * limit;

        const [users] = await pool.execute(
            `SELECT id, full_name, email, role, driver_status,
                    is_active, created_at
             FROM users
             ORDER BY id DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [countResult] = await pool.execute(
            'SELECT COUNT(*) AS total FROM users'
        );

        return res.status(200).json({
            message: 'Users retrieved successfully',
            pagination: {
                page,
                limit,
                total: countResult[0].total
            },
            users
        });
    } catch (error) {
        return next(error);
    }
};

const getUserById = async (req, res, next) => {
    try {
        const userId = Number(req.params.id);

        if (!Number.isInteger(userId) || userId < 1) {
            return res.status(400).json({
                message: 'Invalid user ID'
            });
        }

        const [users] = await pool.execute(
            `SELECT id, full_name, email, role, driver_status,
                    is_active, created_at, updated_at
             FROM users
             WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        return res.status(200).json({
            message: 'User retrieved successfully',
            user: users[0]
        });
    } catch (error) {
        return next(error);
    }
};

const updateUserStatus = async (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        const { is_active } = req.body;

        if (!Number.isInteger(userId) || userId < 1) {
            return res.status(400).json({
                message: 'Invalid user ID'
            });
        }

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                message: 'is_active must be true or false'
            });
        }

        const [users] = await pool.execute(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        await pool.execute(
            'UPDATE users SET is_active = ? WHERE id = ?',
            [is_active, userId]
        );

        return res.status(200).json({
            message: 'User status updated successfully',
            user: {
                id: userId,
                is_active
            }
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    getMyProfile,
    updateMyProfile,
    changeMyPassword,
    deleteMyAccount,
    getAllUsers,
    getUserById,
    updateUserStatus
};
