
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'DELETE']
    }
});

const pool = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const tripRoutes = require('./routes/tripRoutes');
const driverRoutes = require('./routes/driverRoutes');

const setupSocket = require('./sockets/socket');

// Security and request middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Make Socket.IO available in routes and controllers
app.set('io', io);

// Health check
app.get('/api/health', async (req, res, next) => {
    try {
        await pool.query('SELECT 1');

        return res.status(200).json({
            message: 'Ride-Hailing API is running',
            database: 'Connected'
        });
    } catch (error) {
        return next(error);
    }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/drivers', driverRoutes);

// Handle unknown routes
app.use((req, res) => {
    return res.status(404).json({
        message: 'Route not found'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error(error);

    if (res.headersSent) {
        return next(error);
    }

    return res.status(500).json({
        message: 'Internal server error'
    });
});

// Configure Socket.IO events
setupSocket(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
