
const { io } = require('socket.io-client');

const token = 'PASTE_NEW_RIDER_JWT_HERE';
const tripId = 6;

const socket = io('http://localhost:3000', {
    auth: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6InJpZGVyIiwiaWF0IjoxNzkyNDI1NDU1LCJleHAiOjE3OTI1MTE4NTV9.ita7ZkCIYbgQCZESK3Ed_h6cWQT1VWKNb7frwYpbVFA'
    }
});

socket.on('connect', () => {
    console.log('Connected successfully!');
    console.log('Socket ID:', socket.id);

    socket.emit('join_trip', tripId, (response) => {
        console.log('Join trip response:', response);

        if (!response.success) {
            console.log('Could not join trip room.');
        }
    });
});

socket.on('driver_location_updated', (location) => {
    console.log('Driver location updated:');
    console.log(location);
});

socket.on('trip_status_updated', (data) => {
    console.log('Trip status updated:');
    console.log(data);
});

socket.on('connect_error', (error) => {
    console.log('Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
});
