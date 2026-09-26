/**
 * Message / Chat Mongoose Schema & Model
 * Powers the Customer-to-Admin Support Chat System
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Customer reference is required']
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Sender reference is required']
    },
    senderRole: {
        type: String,
        enum: ['customer', 'admin'],
        required: true,
        default: 'customer'
    },
    senderName: {
        type: String,
        trim: true,
        default: ''
    },
    customerName: {
        type: String,
        trim: true,
        default: ''
    },
    customerEmail: {
        type: String,
        trim: true,
        default: ''
    },
    text: {
        type: String,
        required: [true, 'Message text is required'],
        trim: true
    },
    isReadByAdmin: {
        type: Boolean,
        default: false
    },
    isReadByCustomer: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

messageSchema.index({ customer: 1, createdAt: 1 });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
