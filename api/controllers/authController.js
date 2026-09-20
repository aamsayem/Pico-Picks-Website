/**
 * Auth Controller - User Registration & Login handlers
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
    const secret = process.env.JWT_SECRET || 'pico_picks_super_secret_jwt_key_2026';
    return jwt.sign({ id }, secret, { expiresIn: '30d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Please provide all required fields (username, email, password)' });
        }

        const userExists = await User.findOne({
            $or: [
                { username: username.toLowerCase() },
                { email: email.toLowerCase() }
            ]
        });

        if (userExists) {
            return res.status(400).json({ error: 'User with this username or email already exists' });
        }

        const user = await User.create({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password
        });

        if (user) {
            res.status(201).json({
                token: generateToken(user._id),
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    cart: user.cart
                }
            });
        } else {
            res.status(400).json({ error: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message || 'Server error during registration' });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Please enter both username/email and password' });
        }

        const user = await User.findOne({
            $or: [
                { username: username.toLowerCase() },
                { email: username.toLowerCase() }
            ]
        });

        if (user && (await user.matchPassword(password))) {
            res.json({
                token: generateToken(user._id),
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    cart: user.cart
                }
            });
        } else {
            res.status(401).json({ error: 'Invalid username/email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message || 'Server error during login' });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching user profile' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile
};
