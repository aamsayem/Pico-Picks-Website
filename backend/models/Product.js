/**
 * Product Mongoose Schema & Model
 */

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    price: {
        type: Number,
        required: [true, 'Product price is required'],
        min: 0
    },
    rating: {
        type: Number,
        default: 5,
        min: 0,
        max: 5
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isLatest: {
        type: Boolean,
        default: false
    },
    image: {
        type: String,
        required: [true, 'Primary image path is required']
    },
    images: {
        type: [String],
        default: []
    },
    description: {
        type: String,
        default: ''
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    colors: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
