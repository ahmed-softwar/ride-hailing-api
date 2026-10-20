
const pool = require('../config/database');

const emitTripStatusUpdate = (req, trip) => {
    const io = req.app.get('io');

    if (!io) {
        return;
    }

    io.to(`trip_${trip.id}`).emit('trip_status_updated', {
        tripId: trip.id,
        status: trip.status,
        trip
    });
};

const getMyTrips = async (req, res, next) => {
    try {
        const page = Number.parseInt(req.query.page, 10) || 1;
        const limit = Number.parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        let where = '';
        let values = [];

        if (req.user.role === 'rider') {
            where = 'WHERE rider_id = ?';
            values = [req.user.id];
        } else if (req.user.role === 'driver') {
            where = 'WHERE driver_id = ?';
            values = [req.user.id];
        }

        const [trips] = await pool.execute(
            `SELECT *
             FROM trips
             ${where}
             ORDER BY created_at DESC, id DESC
             LIMIT ? OFFSET ?`,
            [...values, limit, offset]
        );

        const [countResult] = await pool.execute(
            `SELECT COUNT(*) AS total
             FROM trips
             ${where}`,
            values
        );

        return res.status(200).json({
            message: 'Trips retrieved successfully',
            pagination: {
                page,
                limit,
                total: countResult[0].total
            },
            trips
        });
    } catch (error) {
        return next(error);
    }
};

const getTripById = async (req, res, next) => {
    try {
        const tripId = Number(req.params.id);

        const [trips] = await pool.execute(
            'SELECT * FROM trips WHERE id = ?',
            [tripId]
        );

        if (trips.length === 0) {
            return res.status(404).json({
                message: 'Trip not found'
            });
        }

        const trip = trips[0];

        const isAdmin = req.user.role === 'admin';
        const isRider = trip.rider_id === req.user.id;
        const isDriver = trip.driver_id === req.user.id;

        if (!isAdmin && !isRider && !isDriver) {
            return res.status(403).json({
                message: 'You do not have permission to view this trip'
            });
        }

        return res.status(200).json({
            message: 'Trip retrieved successfully',
            trip
        });
    } catch (error) {
        return next(error);
    }
};

const createTrip = async (req, res, next) => {
    try {
        const {
            pickup_latitude,
            pickup_longitude,
            destination_latitude,
            destination_longitude
        } = req.body;

        const riderId = req.user.id;

        const [result] = await pool.execute(
            `INSERT INTO trips (
                rider_id,
                pickup_latitude,
                pickup_longitude,
                destination_latitude,
                destination_longitude
            ) VALUES (?, ?, ?, ?, ?)`,
            [
                riderId,
                pickup_latitude,
                pickup_longitude,
                destination_latitude,
                destination_longitude
            ]
        );

        const [trips] = await pool.execute(
            'SELECT * FROM trips WHERE id = ?',
            [result.insertId]
        );

        return res.status(201).json({
            message: 'Trip created successfully',
            trip: trips[0]
        });
    } catch (error) {
        return next(error);
    }
};

const acceptTrip = async (req, res, next) => {
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [trips] = await connection.execute(
            'SELECT * FROM trips WHERE id = ? FOR UPDATE',
            [Number(req.params.id)]
        );

        if (trips.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: 'Trip not found'
            });
        }

        const trip = trips[0];

        if (trip.status !== 'requested' || trip.driver_id !== null) {
            await connection.rollback();

            return res.status(409).json({
                message: 'Trip is not available for acceptance'
            });
        }

        const [drivers] = await connection.execute(
            `SELECT id, role, driver_status, is_active
             FROM users
             WHERE id = ?
             FOR UPDATE`,
            [req.user.id]
        );

        if (
            drivers.length === 0 ||
            drivers[0].role !== 'driver' ||
            !drivers[0].is_active
        ) {
            await connection.rollback();

            return res.status(403).json({
                message: 'Active driver account is required'
            });
        }

        if (drivers[0].driver_status !== 'available') {
            await connection.rollback();

            return res.status(409).json({
                message: 'Driver is not available'
            });
        }

        const [result] = await connection.execute(
            `UPDATE trips
             SET driver_id = ?, status = 'accepted'
             WHERE id = ? AND status = 'requested' AND driver_id IS NULL`,
            [req.user.id, trip.id]
        );

        if (result.affectedRows !== 1) {
            await connection.rollback();

            return res.status(409).json({
                message: 'Trip is no longer available'
            });
        }

        await connection.execute(
            `UPDATE users
             SET driver_status = 'busy'
             WHERE id = ?`,
            [req.user.id]
        );

        await connection.commit();

        const [updatedTrips] = await pool.execute(
            'SELECT * FROM trips WHERE id = ?',
            [trip.id]
        );

        emitTripStatusUpdate(req, updatedTrips[0]);

        return res.status(200).json({
            message: 'Trip accepted successfully',
            trip: updatedTrips[0]
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        return next(error);
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const changeTripStatus = async (
    req,
    res,
    next,
    expectedStatus,
    newStatus,
    successMessage,
    releaseDriver
) => {
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [trips] = await connection.execute(
            'SELECT * FROM trips WHERE id = ? FOR UPDATE',
            [Number(req.params.id)]
        );

        if (trips.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: 'Trip not found'
            });
        }

        const trip = trips[0];

        if (trip.driver_id !== req.user.id) {
            await connection.rollback();

            return res.status(403).json({
                message: 'Only the assigned driver can perform this action'
            });
        }

        if (trip.status !== expectedStatus) {
            await connection.rollback();

            return res.status(409).json({
                message: `Trip must be ${expectedStatus} before this action`
            });
        }

        await connection.execute(
            'UPDATE trips SET status = ? WHERE id = ?',
            [newStatus, trip.id]
        );

        if (releaseDriver) {
            await connection.execute(
                `UPDATE users
                 SET driver_status = 'available'
                 WHERE id = ?`,
                [req.user.id]
            );
        }

        await connection.commit();

        const [updatedTrips] = await pool.execute(
            'SELECT * FROM trips WHERE id = ?',
            [trip.id]
        );

        emitTripStatusUpdate(req, updatedTrips[0]);

        return res.status(200).json({
            message: successMessage,
            trip: updatedTrips[0]
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        return next(error);
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const startTrip = async (req, res, next) => {
    return changeTripStatus(
        req,
        res,
        next,
        'accepted',
        'in_progress',
        'Trip started successfully',
        false
    );
};

const completeTrip = async (req, res, next) => {
    return changeTripStatus(
        req,
        res,
        next,
        'in_progress',
        'completed',
        'Trip completed successfully',
        true
    );
};

const cancelTrip = async (req, res, next) => {
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [trips] = await connection.execute(
            'SELECT * FROM trips WHERE id = ? FOR UPDATE',
            [Number(req.params.id)]
        );

        if (trips.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                message: 'Trip not found'
            });
        }

        const trip = trips[0];
        const isAdmin = req.user.role === 'admin';
        const isRider = trip.rider_id === req.user.id;
        const isAssignedDriver = trip.driver_id === req.user.id;

        if (!isAdmin && !isRider && !isAssignedDriver) {
            await connection.rollback();

            return res.status(403).json({
                message: 'You do not have permission to cancel this trip'
            });
        }

        const canCancel =
            (isRider && ['requested', 'accepted'].includes(trip.status)) ||
            (isAssignedDriver && trip.status === 'accepted') ||
            (isAdmin &&
                ['requested', 'accepted', 'in_progress'].includes(trip.status));

        if (!canCancel) {
            await connection.rollback();

            return res.status(409).json({
                message: 'Trip cannot be cancelled in its current status'
            });
        }

        await connection.execute(
            `UPDATE trips
             SET status = 'cancelled', cancelled_by = ?
             WHERE id = ?`,
            [req.user.id, trip.id]
        );

        if (trip.driver_id !== null) {
            await connection.execute(
                `UPDATE users
                 SET driver_status = 'available'
                 WHERE id = ?`,
                [trip.driver_id]
            );
        }

        await connection.commit();

        const [updatedTrips] = await pool.execute(
            'SELECT * FROM trips WHERE id = ?',
            [trip.id]
        );

        emitTripStatusUpdate(req, updatedTrips[0]);

        return res.status(200).json({
            message: 'Trip cancelled successfully',
            trip: updatedTrips[0]
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        return next(error);
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    createTrip,
    getMyTrips,
    getTripById,
    acceptTrip,
    startTrip,
    completeTrip,
    cancelTrip
};
