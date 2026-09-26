/**
 * Auth Controller - User Registration & Login Handlers
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate JWT token signed with user ID and role
 */
const generateToken = (user) => {
    const secret = process.env.JWT_SECRET || 'pico_picks_super_secret_jwt_key_2026';
    return jwt.sign(
        { id: user._id, role: user.role },
        secret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );
};

// @desc    Register a new user (Customer or Admin)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Please provide all required fields (username, email, password)' });
        }

        if (password.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters long' });
        }

        const normalizedUsername = username.trim().toLowerCase();
        const normalizedEmail = email.trim().toLowerCase();

        // Check if user already exists
        const userExists = await User.findOne({
            $or: [
                { username: normalizedUsername },
                { email: normalizedEmail }
            ]
        });

        if (userExists) {
            return res.status(400).json({ error: 'User with this username or email already exists' });
        }

        // Validate role if provided, default to 'customer'
        const assignedRole = (role && ['customer', 'admin'].includes(role)) ? role : 'customer';

        const user = await User.create({
            username: normalizedUsername,
            email: normalizedEmail,
            password,
            role: assignedRole
        });

        if (user) {
            res.status(201).json({
                message: 'User registered successfully',
                token: generateToken(user),
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    cart: user.cart || []
                }
            });
        } else {
            res.status(400).json({ error: 'Invalid user registration data' });
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
        const { username, email, password } = req.body;
        const loginIdentifier = (username || email || '').trim().toLowerCase();

        if (!loginIdentifier || !password) {
            return res.status(400).json({ error: 'Please enter username/email and password' });
        }

        // Search by username OR email
        const user = await User.findOne({
            $or: [
                { username: loginIdentifier },
                { email: loginIdentifier }
            ]
        });

        if (user && (await user.matchPassword(password))) {
            res.json({
                message: 'Login successful',
                token: generateToken(user),
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    cart: user.cart || []
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

// @desc    Get current authenticated user profile
// @route   GET /api/auth/me
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (user) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                name: user.name || '',
                phone: user.phone || '',
                address: user.address || '',
                city: user.city || '',
                postalCode: user.postalCode || '',
                cart: user.cart || [],
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Server error fetching user profile' });
    }
};

// @desc    Update authenticated user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { name, phone, address, city, postalCode, password } = req.body;

        if (name !== undefined) user.name = (name || '').trim();
        if (phone !== undefined) user.phone = (phone || '').trim();
        if (address !== undefined) user.address = (address || '').trim();
        if (city !== undefined) user.city = (city || '').trim();
        if (postalCode !== undefined) user.postalCode = (postalCode || '').trim();

        if (password) {
            if (password.length < 4) {
                return res.status(400).json({ error: 'Password must be at least 4 characters long' });
            }
            user.password = password; // pre('save') middleware will hash this automatically
        }

        const updatedUser = await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                role: updatedUser.role,
                name: updatedUser.name || '',
                phone: updatedUser.phone || '',
                address: updatedUser.address || '',
                city: updatedUser.city || '',
                postalCode: updatedUser.postalCode || '',
                cart: updatedUser.cart || []
            }
        });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: error.message || 'Server error updating profile' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile
};
