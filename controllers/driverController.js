
const pool = require('../config/database');

const updateDriverLocation = async (req, res, next) => {
    try {
        const { latitude, longitude } = req.body;

        const [drivers] = await pool.execute(
            `SELECT id, driver_status, is_active
             FROM users
             WHERE id = ? AND role = 'driver'`,
            [req.user.id]
        );

        if (drivers.length === 0 || !drivers[0].is_active) {
            return res.status(403).json({
                message: 'Active driver account is required'
            });
        }

        if (!['available', 'busy'].includes(drivers[0].driver_status)) {
            return res.status(409).json({
                message: 'Driver must be available or busy to update location'
            });
        }

        await pool.execute(
            `INSERT INTO driver_locations
                (driver_id, latitude, longitude)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
                latitude = VALUES(latitude),
                longitude = VALUES(longitude),
                updated_at = CURRENT_TIMESTAMP`,
            [req.user.id, latitude, longitude]
        );

        const [locations] = await pool.execute(
            `SELECT driver_id, latitude, longitude, updated_at
             FROM driver_locations
             WHERE driver_id = ?`,
            [req.user.id]
        );

        const [activeTrips] = await pool.execute(
            `SELECT id
             FROM trips
             WHERE driver_id = ?
               AND status IN ('accepted', 'in_progress')`,
            [req.user.id]
        );

        const io = req.app.get('io');

        if (io) {
            for (const trip of activeTrips) {
                io.to(`trip_${trip.id}`).emit(
                    'driver_location_updated',
                    {
                        driverId: locations[0].driver_id,
                        latitude: locations[0].latitude,
                        longitude: locations[0].longitude,
                        updatedAt: locations[0].updated_at
                    }
                );
            }
        }

        return res.status(200).json({
            message: 'Driver location updated successfully',
            location: locations[0]
        });
    } catch (error) {
        return next(error);
    }
};

const getDriverLocation = async (req, res, next) => {
    try {
        const driverId = Number(req.params.id);

        const [drivers] = await pool.execute(
            `SELECT id
             FROM users
             WHERE id = ? AND role = 'driver' AND is_active = 1`,
            [driverId]
        );

        if (drivers.length === 0) {
            return res.status(404).json({
                message: 'Driver not found'
            });
        }

        if (
            req.user.role === 'driver' &&
            Number(req.user.id) !== driverId
        ) {
            return res.status(403).json({
                message: 'You do not have permission to view this location'
            });
        }

        if (req.user.role === 'rider') {
            const [trips] = await pool.execute(
                `SELECT id
                 FROM trips
                 WHERE rider_id = ?
                   AND driver_id = ?
                   AND status IN ('accepted', 'in_progress')
                 LIMIT 1`,
                [req.user.id, driverId]
            );

            if (trips.length === 0) {
                return res.status(403).json({
                    message: 'You do not have permission to view this location'
                });
            }
        } else if (
            req.user.role !== 'admin' &&
            req.user.role !== 'driver'
        ) {
            return res.status(403).json({
                message: 'You do not have permission to view this location'
            });
        }

        const [locations] = await pool.execute(
            `SELECT driver_id, latitude, longitude, updated_at
             FROM driver_locations
             WHERE driver_id = ?`,
            [driverId]
        );

        if (locations.length === 0) {
            return res.status(404).json({
                message: 'Driver location not found'
            });
        }

        return res.status(200).json({
            location: locations[0]
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    updateDriverLocation,
    getDriverLocation
};
