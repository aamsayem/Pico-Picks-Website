/**
 * Product Express Routes
 * - Public: Browse products, view product details, run seed
 * - Admin Only: Create, update, delete products
 */

const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    addProductReview,
    seedProducts
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');

// Public routes
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/seed', seedProducts);

// Customer-protected reviews route
router.post('/:id/reviews', protect, addProductReview);

// Admin-protected routes
router.post('/', protect, adminOnly, createProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;
