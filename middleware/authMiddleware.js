
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        console.error('JWT_SECRET is not configured');

        return res.status(500).json({
            message: 'Internal server error'
        });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Access token is required'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            message: 'Access token is required'
        });
    }

    try {
        const decoded = jwt.verify(token, secret);

        req.user = decoded;

        return next();
    } catch (error) {
        return res.status(401).json({
            message: 'Invalid or expired token'
        });
    }
};

module.exports = authMiddleware;
