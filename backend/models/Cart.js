/**
 * Cart Mongoose Schema & Model
 * Persists user cart items in MongoDB
 */

const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: [true, 'Product ID is required'],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        default: 1,
        min: [1, 'Quantity cannot be less than 1']
    }
}, { _id: false });

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: {
        type: [cartItemSchema],
        default: []
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
