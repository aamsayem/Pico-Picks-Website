/**
 * Cart Controller - Manage User Shopping Cart in MongoDB
 */

const User = require('../models/User');
const Product = require('../models/Product');

// Helper to calculate totals and populate cart item product details
const populateCartDetails = async (cartItems) => {
    let populatedItems = [];
    let subtotal = 0;

    for (const item of cartItems) {
        let product = await Product.findOne({ id: item.productId });
        
        if (product) {
            const itemSubtotal = product.price * item.quantity;
            subtotal += itemSubtotal;
            populatedItems.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: item.quantity,
                itemSubtotal: itemSubtotal
            });
        }
    }

    const tax = subtotal > 0 ? 30.00 : 0.00;
    const total = subtotal + tax;

    return {
        items: populatedItems,
        subtotal,
        tax,
        total
    };
};

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const cartData = await populateCartDetails(user.cart);
        res.json(cartData);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
};

// @desc    Add item to cart or increase quantity
// @route   POST /api/cart/add
// @access  Private
const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const qty = parseInt(quantity, 10) || 1;

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        const user = await User.findById(req.user._id);
        const existingItemIndex = user.cart.findIndex(item => item.productId === productId);

        if (existingIndex > -1 || existingItemIndex > -1) {
            user.cart[existingItemIndex].quantity += qty;
        } else {
            user.cart.push({ productId, quantity: qty });
        }

        await user.save();
        const cartData = await populateCartDetails(user.cart);
        res.json(cartData);
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
};

// @desc    Update item quantity in cart
// @route   PUT /api/cart/update
// @access  Private
const updateCartItem = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const qty = Math.max(1, parseInt(quantity, 10) || 1);

        const user = await User.findById(req.user._id);
        const item = user.cart.find(i => i.productId === productId);

        if (item) {
            item.quantity = qty;
            await user.save();
        }

        const cartData = await populateCartDetails(user.cart);
        res.json(cartData);
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ error: 'Failed to update cart item' });
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:productId
// @access  Private
const removeCartItem = async (req, res) => {
    try {
        const { productId } = req.params;

        const user = await User.findById(req.user._id);
        user.cart = user.cart.filter(i => i.productId !== productId);

        await user.save();
        const cartData = await populateCartDetails(user.cart);
        res.json(cartData);
    } catch (error) {
        console.error('Error removing cart item:', error);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem
};
