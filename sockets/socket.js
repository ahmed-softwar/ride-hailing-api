
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

function setupSocket(io) {
    // Verify JWT before allowing a socket connection
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Access token is required'));
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            socket.user = decoded;

            return next();
        } catch (error) {
            return next(new Error('Invalid or expired token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(
            `User connected: ${socket.id}, User ID: ${socket.user.id}`
        );

        // Allow authorized users to join a trip room
        socket.on('join_trip', async (tripId, callback) => {
            try {
                if (typeof callback !== 'function') {
                    return;
                }

                const id = Number(tripId);

                if (!Number.isInteger(id) || id <= 0) {
                    return callback({
                        success: false,
                        message: 'Invalid trip ID'
                    });
                }

                const [trips] = await pool.execute(
                    `SELECT id, rider_id, driver_id
                     FROM trips
                     WHERE id = ?`,
                    [id]
                );

                if (trips.length === 0) {
                    return callback({
                        success: false,
                        message: 'Trip not found'
                    });
                }

                const trip = trips[0];

                const userId = Number(socket.user.id);
                const riderId = Number(trip.rider_id);
                const driverId = trip.driver_id === null
                    ? null
                    : Number(trip.driver_id);

                const isAdmin = socket.user.role === 'admin';
                const isRider = riderId === userId;
                const isDriver = driverId === userId;

                if (!isAdmin && !isRider && !isDriver) {
                    return callback({
                        success: false,
                        message: 'You do not have permission to join this trip'
                    });
                }

                socket.join(`trip_${id}`);

                return callback({
                    success: true,
                    message: 'Joined trip room successfully',
                    tripId: id
                });
            } catch (error) {
                console.error('Join trip error:', error);

                if (typeof callback === 'function') {
                    return callback({
                        success: false,
                        message: 'Internal server error'
                    });
                }
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
}

module.exports = setupSocket;
