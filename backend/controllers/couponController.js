/**
 * Coupon Controller
 * Handles coupon validation, discount computation, and admin coupon CRUD
 */

const Coupon = require('../models/Coupon');

// Default fallback coupons in case database has no coupons seeded yet
const DEFAULT_COUPONS = [
    {
        code: 'PICO10',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 500,
        isActive: true
    },
    {
        code: 'SAVE100',
        discountType: 'flat',
        discountValue: 100,
        minOrderAmount: 1000,
        isActive: true
    },
    {
        code: 'FREESHIP',
        discountType: 'flat',
        discountValue: 50,
        minOrderAmount: 500,
        isActive: true
    }
];

// Helper to seed default coupons if database is empty
const seedDefaultsIfNeeded = async () => {
    try {
        const count = await Coupon.countDocuments();
        if (count === 0) {
            await Coupon.insertMany(DEFAULT_COUPONS);
        }
    } catch (err) {
        console.warn('Coupon auto-seed notice:', err.message);
    }
};

// @desc    Validate coupon code and compute discount amount
// @route   POST /api/coupons/validate
// @access  Public
const validateCoupon = async (req, res) => {
    try {
        const { code, subtotal } = req.body;
        const normalizedCode = (code || '').trim().toUpperCase();
        const currentSubtotal = parseFloat(subtotal) || 0;

        if (!normalizedCode) {
            return res.status(400).json({ error: 'Please enter a coupon code' });
        }

        if (currentSubtotal <= 0) {
            return res.status(400).json({ error: 'Cart subtotal must be greater than zero to apply coupon' });
        }

        await seedDefaultsIfNeeded();

        // Find coupon in database
        let coupon = await Coupon.findOne({ code: normalizedCode });

        // Fallback to built-in presets if not found in DB
        if (!coupon) {
            coupon = DEFAULT_COUPONS.find(c => c.code === normalizedCode);
        }

        if (!coupon) {
            return res.status(404).json({ error: `Coupon code "${normalizedCode}" is invalid` });
        }

        if (!coupon.isActive) {
            return res.status(400).json({ error: `Coupon "${normalizedCode}" is no longer active` });
        }

        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            return res.status(400).json({ error: `Coupon "${normalizedCode}" has expired` });
        }

        if (currentSubtotal < (coupon.minOrderAmount || 0)) {
            return res.status(400).json({
                error: `Coupon "${normalizedCode}" requires a minimum order of ৳${Number(coupon.minOrderAmount).toFixed(2)} (current: ৳${currentSubtotal.toFixed(2)})`
            });
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = Math.round((currentSubtotal * coupon.discountValue) / 100);
        } else {
            discountAmount = Math.min(coupon.discountValue, currentSubtotal);
        }

        res.json({
            valid: true,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount,
            message: `Coupon "${coupon.code}" applied successfully! You saved ৳${discountAmount.toFixed(2)}.`
        });
    } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({ error: error.message || 'Failed to validate coupon' });
    }
};

// @desc    Get all coupons (Admin)
// @route   GET /api/coupons
// @access  Public / Admin
const getCoupons = async (req, res) => {
    try {
        await seedDefaultsIfNeeded();
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json(coupons);
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
};

// @desc    Create a new coupon (Admin)
// @route   POST /api/coupons
// @access  Private (Admin)
const createCoupon = async (req, res) => {
    try {
        const { code, discountType, discountValue, minOrderAmount, isActive, expiresAt } = req.body;

        if (!code || !discountValue) {
            return res.status(400).json({ error: 'Code and discount value are required' });
        }

        const normalizedCode = code.trim().toUpperCase();
        const existing = await Coupon.findOne({ code: normalizedCode });
        if (existing) {
            return res.status(400).json({ error: `Coupon code "${normalizedCode}" already exists` });
        }

        const coupon = await Coupon.create({
            code: normalizedCode,
            discountType: discountType || 'percentage',
            discountValue: Number(discountValue),
            minOrderAmount: Number(minOrderAmount) || 0,
            isActive: isActive !== undefined ? isActive : true,
            expiresAt: expiresAt ? new Date(expiresAt) : null
        });

        res.status(201).json({
            message: 'Coupon created successfully',
            coupon
        });
    } catch (error) {
        console.error('Error creating coupon:', error);
        res.status(500).json({ error: error.message || 'Failed to create coupon' });
    }
};

// @desc    Delete a coupon (Admin)
// @route   DELETE /api/coupons/:id
// @access  Private (Admin)
const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findByIdAndDelete(id);

        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        res.json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({ error: 'Failed to delete coupon' });
    }
};

module.exports = {
    validateCoupon,
    getCoupons,
    createCoupon,
    deleteCoupon
};
