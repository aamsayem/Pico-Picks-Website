/**
 * Cart Controller - Manage User Shopping Cart in MongoDB using dedicated Cart Model
 */

const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const User = require('../models/User');
const Product = require('../models/Product');

/**
 * Helper to fetch or create a user's Cart document
 * Migrates existing legacy user.cart if Cart doesn't exist yet
 */
const getOrCreateUserCart = async (userId) => {
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
        // Check for existing items in user model to migrate seamlessly
        const user = await User.findById(userId);
        const initialItems = (user && Array.isArray(user.cart) && user.cart.length > 0)
            ? user.cart.map(item => ({ productId: item.productId, quantity: item.quantity }))
            : [];

        cart = await Cart.create({
            user: userId,
            items: initialItems
        });
    }

    return cart;
};

/**
 * Helper to populate product details and calculate totals
 */
const populateCartDetails = async (cartItems) => {
    let populatedItems = [];
    let subtotal = 0;

    for (const item of cartItems) {
        // Lookup by custom string id or MongoDB _id
        let product = await Product.findOne({ id: item.productId });
        if (!product && mongoose.Types.ObjectId.isValid(item.productId)) {
            product = await Product.findById(item.productId);
        }

        if (product) {
            const itemSubtotal = product.price * item.quantity;
            subtotal += itemSubtotal;
            populatedItems.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: item.quantity,
                color: item.color || '',
                itemSubtotal
            });
        }
    }

    const tax = subtotal > 0 ? 30.00 : 0.00;
    const shippingFee = subtotal > 0 ? (subtotal > 2000 ? 0.00 : 50.00) : 0.00;
    const total = subtotal + tax + shippingFee;

    return {
        items: populatedItems,
        subtotal,
        tax,
        shippingFee,
        total
    };
};

// @desc    Get current user's cart
// @route   GET /api/cart
// @access  Private (Customer/User)
const getCart = async (req, res) => {
    try {
        const cart = await getOrCreateUserCart(req.user._id);
        const cartData = await populateCartDetails(cart.items);
        res.json(cartData);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
};

// @desc    Add item to cart or increment quantity
// @route   POST /api/cart/add
// @access  Private (Customer/User)
const addToCart = async (req, res) => {
    try {
        const { productId, quantity, color } = req.body;
        const qty = parseInt(quantity, 10) || 1;
        const chosenColor = (color || '').trim();

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        // Verify product exists in catalog
        let product = await Product.findOne({ id: productId });
        if (!product && mongoose.Types.ObjectId.isValid(productId)) {
            product = await Product.findById(productId);
        }
        if (!product) {
            return res.status(404).json({ error: 'Product not found in catalog' });
        }

        const cart = await getOrCreateUserCart(req.user._id);
        const existingItemIndex = cart.items.findIndex(
            item => item.productId === product.id && (item.color || '') === chosenColor
        );

        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += qty;
        } else {
            cart.items.push({ productId: product.id, quantity: qty, color: chosenColor });
        }

        await cart.save();
        const cartData = await populateCartDetails(cart.items);
        res.json(cartData);
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
};

// @desc    Update item quantity in cart
// @route   PUT /api/cart/update
// @access  Private (Customer/User)
const updateCartItem = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const qty = parseInt(quantity, 10);

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        const cart = await getOrCreateUserCart(req.user._id);

        if (qty <= 0) {
            // Remove item if quantity is zero or negative
            cart.items = cart.items.filter(item => item.productId !== productId);
        } else {
            const item = cart.items.find(i => i.productId === productId);
            if (item) {
                item.quantity = qty;
            } else {
                return res.status(404).json({ error: 'Item not found in cart' });
            }
        }

        await cart.save();
        const cartData = await populateCartDetails(cart.items);
        res.json(cartData);
    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({ error: 'Failed to update cart item' });
    }
};

// @desc    Remove single item from cart
// @route   DELETE /api/cart/remove/:productId
// @access  Private (Customer/User)
const removeCartItem = async (req, res) => {
    try {
        const { productId } = req.params;

        const cart = await getOrCreateUserCart(req.user._id);
        cart.items = cart.items.filter(item => item.productId !== productId);

        await cart.save();
        const cartData = await populateCartDetails(cart.items);
        res.json(cartData);
    } catch (error) {
        console.error('Error removing cart item:', error);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
};

// @desc    Clear all items from user cart
// @route   DELETE /api/cart/clear
// @access  Private (Customer/User)
const clearCart = async (req, res) => {
    try {
        const cart = await getOrCreateUserCart(req.user._id);
        cart.items = [];
        await cart.save();

        res.json({
            message: 'Cart cleared successfully',
            items: [],
            subtotal: 0,
            tax: 0,
            shippingFee: 0,
            total: 0
        });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ error: 'Failed to clear cart' });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    populateCartDetails,
    getOrCreateUserCart
};
