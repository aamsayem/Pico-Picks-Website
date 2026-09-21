/**
 * Authentication & Authorization Middleware
 * - protect: Verifies JWT token and attaches user to req.user
 * - adminOnly: Ensures authenticated user has admin role
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const secret = process.env.JWT_SECRET || 'pico_picks_super_secret_jwt_key_2026';
            const decoded = jwt.verify(token, secret);

            // Fetch user from DB, excluding password
            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(401).json({ error: 'User not found or authorization revoked' });
            }

            req.user = user;
            return next();
        } catch (error) {
            console.error('JWT verification failed:', error.message);
            return res.status(401).json({ error: 'Not authorized, token invalid or expired' });
        }
    }

    return res.status(401).json({ error: 'Not authorized, no token provided' });
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ error: 'Access denied: Admin privileges required' });
};

module.exports = {
    protect,
    adminOnly,
    // Aliases for convenience
    authenticate: protect,
    isAdmin: adminOnly
};
