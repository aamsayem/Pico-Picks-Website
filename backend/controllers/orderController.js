/**
 * Order Controller - Customer Checkout & Admin Order Management
 */

const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Create a new order from active cart (Checkout)
// @route   POST /api/orders
// @access  Private (Customer)
const createOrder = async (req, res) => {
    try {
        const { shippingAddress, paymentMethod, items } = req.body;

        // Validate shipping address
        if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.address || !shippingAddress.city || !shippingAddress.phone) {
            return res.status(400).json({
                error: 'Please provide complete shipping details: fullName, address, city, and phone are required'
            });
        }

        // Determine items to order: from body or from persisted DB Cart
        let sourceItems = items;
        let cart = null;

        if (!sourceItems || !Array.isArray(sourceItems) || sourceItems.length === 0) {
            if (req.user) {
                cart = await Cart.findOne({ user: req.user._id });
                if (cart && cart.items && cart.items.length > 0) {
                    sourceItems = cart.items;
                }
            }
        }

        if (!sourceItems || sourceItems.length === 0) {
            return res.status(400).json({ error: 'Your shopping cart is empty. Please add items before checkout.' });
        }

        // Build order items with verified database pricing to prevent client price tampering
        const verifiedOrderItems = [];
        let subtotal = 0;

        for (const item of sourceItems) {
            const product = await Product.findOne({
                $or: [
                    { id: item.productId },
                    ...(mongoose.Types.ObjectId.isValid(item.productId) ? [{ _id: item.productId }] : [])
                ]
            });

            if (!product) {
                return res.status(400).json({
                    error: `Product with ID "${item.productId}" was not found in catalog`
                });
            }

            const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
            const itemPrice = product.price;
            subtotal += itemPrice * qty;

            verifiedOrderItems.push({
                productId: product.id,
                name: product.name,
                image: product.image || '',
                price: itemPrice,
                quantity: qty,
                color: item.color || ''
            });
        }

        const tax = subtotal > 0 ? 30.00 : 0.00;
        const shippingFee = subtotal > 2000 ? 0.00 : 50.00;
        const totalAmount = subtotal + tax + shippingFee;

        const order = await Order.create({
            user: req.user ? req.user._id : null,
            guestEmail: (req.body.email || shippingAddress.email || '').trim(),
            orderItems: verifiedOrderItems,
            shippingAddress: {
                fullName: shippingAddress.fullName.trim(),
                address: shippingAddress.address.trim(),
                city: shippingAddress.city.trim(),
                postalCode: (shippingAddress.postalCode || '').trim(),
                phone: shippingAddress.phone.trim()
            },
            paymentMethod: paymentMethod || 'Cash on Delivery',
            paymentStatus: 'Pending',
            orderStatus: 'Pending',
            subtotal,
            tax,
            shippingFee,
            totalAmount
        });

        // Automatically clear customer's cart after successful order creation
        if (req.user) {
            if (!cart) {
                cart = await Cart.findOne({ user: req.user._id });
            }
            if (cart) {
                cart.items = [];
                await cart.save();
            }
        }

        res.status(201).json({
            message: 'Order created successfully',
            order
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: error.message || 'Failed to create order' });
    }
};

// @desc    Get logged in user's order history
// @route   GET /api/orders/my-orders
// @access  Private (Customer)
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching customer orders:', error);
        res.status(500).json({ error: 'Failed to fetch your orders' });
    }
};

// @desc    Get single order details by ID
// @route   GET /api/orders/:id
// @access  Private (Customer or Admin)
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid order ID format' });
        }

        const order = await Order.findById(id).populate('user', 'username email');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Authorization check: If logged in, ensure owner or admin
        if (order.user && req.user) {
            const isOwner = order.user._id.toString() === req.user._id.toString();
            const isAdmin = req.user.role === 'admin';

            if (!isOwner && !isAdmin) {
                return res.status(403).json({ error: 'Access denied: You do not have permission to view this order' });
            }
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order by ID:', error);
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
};

// @desc    Get all orders across platform
// @route   GET /api/orders
// @access  Private (Admin Only)
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('user', 'username email')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error('Error fetching all orders for admin:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

// @desc    Update order status and/or payment status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin Only)
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { orderStatus, paymentStatus } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid order ID format' });
        }

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const validOrderStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        const validPaymentStatuses = ['Pending', 'Paid', 'Failed'];

        if (orderStatus) {
            if (!validOrderStatuses.includes(orderStatus)) {
                return res.status(400).json({
                    error: `Invalid order status. Allowed: ${validOrderStatuses.join(', ')}`
                });
            }

            order.orderStatus = orderStatus;

            if (orderStatus === 'Delivered' && !order.deliveredAt) {
                order.deliveredAt = new Date();
            }

            // Auto-Stock Deduction: When order is Confirmed or Processing, deduct item quantities from Product stock
            const shouldDeduct = (orderStatus === 'Confirmed' || orderStatus === 'Processing');
            if (shouldDeduct && !order.isStockDeducted) {
                for (const item of order.orderItems) {
                    const product = await Product.findOne({
                        $or: [
                            { id: item.productId },
                            ...(mongoose.Types.ObjectId.isValid(item.productId) ? [{ _id: item.productId }] : [])
                        ]
                    });

                    if (product) {
                        const currentStock = (product.stock !== undefined && product.stock !== null) ? Number(product.stock) : 0;
                        product.stock = Math.max(0, currentStock - item.quantity);
                        await product.save();
                    }
                }
                order.isStockDeducted = true;
            }

            // Restore Stock if order is Cancelled after stock was already deducted
            if (orderStatus === 'Cancelled' && order.isStockDeducted) {
                for (const item of order.orderItems) {
                    const product = await Product.findOne({
                        $or: [
                            { id: item.productId },
                            ...(mongoose.Types.ObjectId.isValid(item.productId) ? [{ _id: item.productId }] : [])
                        ]
                    });

                    if (product) {
                        const currentStock = (product.stock !== undefined && product.stock !== null) ? Number(product.stock) : 0;
                        product.stock = currentStock + item.quantity;
                        await product.save();
                    }
                }
                order.isStockDeducted = false;
            }
        }

        if (paymentStatus) {
            if (!validPaymentStatuses.includes(paymentStatus)) {
                return res.status(400).json({
                    error: `Invalid payment status. Allowed: ${validPaymentStatuses.join(', ')}`
                });
            }
            order.paymentStatus = paymentStatus;
        }

        const updatedOrder = await order.save();
        res.json({
            message: 'Order status updated successfully',
            order: updatedOrder
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: error.message || 'Failed to update order status' });
    }
};

module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    getAllOrders,
    updateOrderStatus
};
