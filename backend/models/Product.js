/**
 * Product Mongoose Schema & Model
 */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userName: {
        type: String,
        required: true,
        trim: true
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: [true, 'Review comment is required'],
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

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
    category: {
        type: String,
        default: 'sports',
        trim: true
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
    galleryImages: {
        type: [String],
        default: []
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
    },
    reviews: {
        type: [reviewSchema],
        default: []
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
