/**
 * Coupon Express Routes
 */

const express = require('express');
const router = express.Router();
const {
    validateCoupon,
    getCoupons,
    createCoupon,
    deleteCoupon
} = require('../controllers/couponController');
const { protect, adminOnly } = require('../middleware/auth');

// Public validation endpoint for checkout & cart
router.post('/validate', validateCoupon);

// Get all coupons (available for admin or public promotion)
router.get('/', getCoupons);

// Admin-only CRUD operations
router.post('/', protect, adminOnly, createCoupon);
router.delete('/:id', protect, adminOnly, deleteCoupon);

module.exports = router;
