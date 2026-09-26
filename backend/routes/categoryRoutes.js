/**
 * Category Express Routes
 */

const express = require('express');
const router = express.Router();
const {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
} = require('../controllers/categoryController');
const { protect, adminOnly } = require('../middleware/auth');

// Public route to retrieve categories for storefront exploration & catalog tabs
router.get('/', getCategories);

// Admin-only management endpoints
router.post('/', protect, adminOnly, createCategory);
router.put('/:id', protect, adminOnly, updateCategory);
router.delete('/:id', protect, adminOnly, deleteCategory);

module.exports = router;
