/**
 * Cart Express Routes
 * All routes require JWT authentication
 */

const express = require('express');
const router = express.Router();
const {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

// All cart routes require authenticated customer/user
router.use(protect);

router.get('/', getCart);
router.post('/add', addToCart);
router.put('/update', updateCartItem);
router.delete('/clear', clearCart);
router.delete('/remove/:productId', removeCartItem);

module.exports = router;
