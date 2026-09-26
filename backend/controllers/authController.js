/**
 * Auth Controller - User Registration, Login & Google OAuth Handlers
 * Supports registration/login via Email OR Bangladeshi Mobile Number, and Continue with Google
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

/**
 * Helper to normalize and detect Bangladeshi mobile numbers
 */
function normalizeBDPhone(str) {
    if (!str) return '';
    let digits = String(str).replace(/\D/g, '');
    if (digits.startsWith('880')) {
        digits = digits.substring(2);
    }
    if (digits.length === 10 && digits.startsWith('1')) {
        digits = '0' + digits;
    }
    return digits;
}

function isPhoneNumber(str) {
    if (!str) return false;
    const clean = String(str).replace(/[\s\-\(\)\+]/g, '');
    return /^(\+?880|0)?1[3-9]\d{8}$/.test(clean);
}

// @desc    Register a new user (Customer or Admin) with Email OR Mobile Number
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { username, email, phone, identifier, password, role } = req.body;
        const primaryIdentifier = (identifier || email || phone || '').trim();

        if (!username || !primaryIdentifier || !password) {
            return res.status(400).json({ 
                error: 'Please provide all required fields: username, email or mobile number, and password' 
            });
        }

        if (password.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters long' });
        }

        const normalizedUsername = username.trim().toLowerCase();
        let registeredEmail = null;
        let registeredPhone = null;

        if (primaryIdentifier.includes('@')) {
            registeredEmail = primaryIdentifier.toLowerCase();
            const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
            if (!emailRegex.test(registeredEmail)) {
                return res.status(400).json({ error: 'Please provide a valid email address' });
            }
        } else if (isPhoneNumber(primaryIdentifier)) {
            registeredPhone = normalizeBDPhone(primaryIdentifier);
            if (registeredPhone.length !== 11) {
                return res.status(400).json({ error: 'Please provide a valid 11-digit Bangladeshi mobile number (e.g. 01886294464)' });
            }
        } else {
            return res.status(400).json({ error: 'Please enter a valid email address or 11-digit mobile number' });
        }

        // Build duplicate check conditions
        const duplicateConditions = [{ username: normalizedUsername }];
        if (registeredEmail) {
            duplicateConditions.push({ email: registeredEmail });
        }
        if (registeredPhone) {
            duplicateConditions.push({ phone: registeredPhone });
            duplicateConditions.push({ phone: '+88' + registeredPhone });
        }

        const userExists = await User.findOne({ $or: duplicateConditions });

        if (userExists) {
            if (userExists.username === normalizedUsername) {
                return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
            }
            if (registeredEmail && userExists.email === registeredEmail) {
                return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
            }
            if (registeredPhone && (userExists.phone === registeredPhone || userExists.phone === '+88' + registeredPhone)) {
                return res.status(400).json({ error: 'An account with this mobile number already exists. Please log in.' });
            }
            return res.status(400).json({ error: 'User already exists with these credentials' });
        }

        // Validate role if provided, default to 'customer'
        const assignedRole = (role && ['customer', 'admin'].includes(role)) ? role : 'customer';

        const user = await User.create({
            username: normalizedUsername,
            email: registeredEmail,
            phone: registeredPhone,
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
                    phone: user.phone || '',
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

// @desc    Authenticate user & get token (Login with Username, Email, OR Mobile Number)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { username, email, phone, identifier, password } = req.body;
        const loginIdentifier = (identifier || username || email || phone || '').trim().toLowerCase();

        if (!loginIdentifier || !password) {
            return res.status(400).json({ error: 'Please enter your username, email, or mobile number, and password' });
        }

        // Build query conditions supporting username, email, and phone variants
        const queryConditions = [
            { username: loginIdentifier },
            { email: loginIdentifier }
        ];

        const phoneCandidate = normalizeBDPhone(loginIdentifier);
        if (phoneCandidate && phoneCandidate.length >= 10) {
            queryConditions.push({ phone: phoneCandidate });
            queryConditions.push({ phone: '+88' + phoneCandidate });
            queryConditions.push({ phone: '88' + phoneCandidate });
        }

        const user = await User.findOne({ $or: queryConditions });

        if (user && (await user.matchPassword(password))) {
            res.json({
                message: 'Login successful',
                token: generateToken(user),
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    phone: user.phone || '',
                    name: user.name || '',
                    role: user.role,
                    cart: user.cart || []
                }
            });
        } else {
            res.status(401).json({ error: 'Invalid login credentials or password. Please verify and try again.' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message || 'Server error during login' });
    }
};

// @desc    Continue with Google (Gmail) OAuth Sign-In & Linking
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
    try {
        const { credential, email, name, googleId, picture } = req.body;

        let userEmail = email;
        let userName = name;
        let userGoogleId = googleId;
        let userPicture = picture || '';

        // If Google Identity Services JWT credential string was passed
        if (credential && typeof credential === 'string') {
            try {
                const parts = credential.split('.');
                if (parts.length === 3) {
                    const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
                    const payload = JSON.parse(payloadStr);
                    if (payload && payload.email) {
                        userEmail = payload.email;
                        userName = payload.name || userName;
                        userGoogleId = payload.sub || userGoogleId;
                        userPicture = payload.picture || userPicture;
                    }
                }
            } catch (jwtErr) {
                console.warn('Could not parse Google JWT credential payload:', jwtErr);
            }
        }

        if (!userEmail) {
            return res.status(400).json({ error: 'Valid Google email is required for authentication' });
        }

        userEmail = userEmail.trim().toLowerCase();
        let user = await User.findOne({
            $or: [
                ...(userGoogleId ? [{ googleId: userGoogleId }] : []),
                { email: userEmail }
            ]
        });

        if (!user) {
            const baseUsername = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') || 'collector';
            let candidateUsername = baseUsername;
            let counter = 1;
            while (await User.findOne({ username: candidateUsername })) {
                candidateUsername = `${baseUsername}_${Math.floor(Math.random() * 10000)}`;
                counter++;
                if (counter > 10) break;
            }

            user = await User.create({
                username: candidateUsername,
                name: userName || baseUsername,
                email: userEmail,
                googleId: userGoogleId || `google_${Date.now()}`,
                avatar: userPicture,
                role: 'customer'
            });
        } else {
            let changed = false;
            if (userGoogleId && !user.googleId) {
                user.googleId = userGoogleId;
                changed = true;
            }
            if (userPicture && !user.avatar) {
                user.avatar = userPicture;
                changed = true;
            }
            if (userName && !user.name) {
                user.name = userName;
                changed = true;
            }
            if (changed) await user.save();
        }

        res.json({
            message: 'Google login successful',
            token: generateToken(user),
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                phone: user.phone || '',
                name: user.name || '',
                avatar: user.avatar || '',
                role: user.role,
                cart: user.cart || []
            }
        });
    } catch (error) {
        console.error('Google Auth error:', error);
        res.status(500).json({ error: error.message || 'Server error during Google authentication' });
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
                phone: user.phone || '',
                role: user.role,
                name: user.name || '',
                avatar: user.avatar || '',
                address: user.address || '',
                division: user.division || '',
                district: user.district || '',
                thana: user.thana || '',
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

        const { name, phone, address, division, district, thana, city, postalCode, password } = req.body;

        if (name !== undefined) user.name = (name || '').trim();
        if (phone !== undefined) user.phone = (phone || '').trim();
        if (address !== undefined) user.address = (address || '').trim();
        if (division !== undefined) user.division = (division || '').trim();
        if (district !== undefined) user.district = (district || '').trim();
        if (thana !== undefined) user.thana = (thana || '').trim();
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
                phone: updatedUser.phone || '',
                role: updatedUser.role,
                name: updatedUser.name || '',
                address: updatedUser.address || '',
                division: updatedUser.division || '',
                district: updatedUser.district || '',
                thana: updatedUser.thana || '',
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
    googleAuth,
    getUserProfile,
    updateUserProfile
};
