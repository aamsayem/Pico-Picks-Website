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
const { protect, adminOnly } = require('../middleware/auth');

// All order endpoints require authenticated user
router.use(protect);

// Customer endpoints
router.post('/', createOrder);
router.get('/my-orders', getMyOrders);
router.get('/:id', getOrderById);

// Admin endpoints
router.get('/', adminOnly, getAllOrders);
router.put('/:id/status', adminOnly, updateOrderStatus);

module.exports = router;
