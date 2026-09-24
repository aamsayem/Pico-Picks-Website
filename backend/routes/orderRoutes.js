/**
 * Order Express Routes
 * - Customer: Create order (Checkout), View my order history, View specific order
 * - Admin: View all platform orders, Update order/payment status
 */

const express = require('express');
const router = express.Router();
const {
    createOrder,
    getMyOrders,
    getOrderById,
    getAllOrders,
    updateOrderStatus
} = require('../controllers/orderController');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

// Customer endpoints (create order supports both logged-in and guest checkout)
router.post('/', optionalAuth, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/:id', optionalAuth, getOrderById);

// Admin endpoints
router.get('/', protect, adminOnly, getAllOrders);
router.put('/:id/status', protect, adminOnly, updateOrderStatus);

module.exports = router;
