/**
 * Order Mongoose Schema & Model
 * Stores checkout orders, item snapshots, shipping info, and order/payment statuses
 */

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: [true, 'Product ID is required']
    },
    name: {
        type: String,
        required: [true, 'Product name is required']
    },
    image: {
        type: String,
        default: ''
    },
    price: {
        type: Number,
        required: [true, 'Item price is required']
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity cannot be less than 1'],
        default: 1
    },
    color: {
        type: String,
        default: '',
        trim: true
    }
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    address: {
        type: String,
        required: [true, 'Shipping address is required'],
        trim: true
    },
    division: {
        type: String,
        default: 'Chattogram',
        trim: true
    },
    district: {
        type: String,
        default: 'Chattogram',
        trim: true
    },
    thana: {
        type: String,
        default: '',
        trim: true
    },
    city: {
        type: String,
        default: '',
        trim: true
    },
    postalCode: {
        type: String,
        default: '',
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Contact phone number is required'],
        trim: true
    }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    guestEmail: {
        type: String,
        trim: true,
        default: ''
    },
    orderItems: {
        type: [orderItemSchema],
        validate: [items => items.length > 0, 'Order must contain at least one item']
    },
    shippingAddress: {
        type: shippingAddressSchema,
        required: [true, 'Shipping address is required']
    },
    paymentMethod: {
        type: String,
        default: 'Cash on Delivery',
        trim: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed'],
        default: 'Pending'
    },
    orderStatus: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    isStockDeducted: {
        type: Boolean,
        default: false
    },
    subtotal: {
        type: Number,
        required: true,
        default: 0
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    couponCode: {
        type: String,
        default: '',
        trim: true
    },
    tax: {
        type: Number,
        default: 0
    },
    deliveryArea: {
        type: String,
        enum: ['Inside Chattogram', 'Outside Chattogram'],
        default: 'Inside Chattogram'
    },
    shippingFee: {
        type: Number,
        default: 70
    },
    advancePaymentDetails: {
        trxId: { type: String, default: '', trim: true },
        senderPhone: { type: String, default: '', trim: true },
        amount: { type: Number, default: 0 },
        isConfirmed: { type: Boolean, default: false }
    },
    totalAmount: {
        type: Number,
        required: [true, 'Total amount is required']
    },
    deliveredAt: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
