/**
 * Category Mongoose Schema & Model
 */

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true
    },
    slug: {
        type: String,
        required: [true, 'Category slug is required'],
        unique: true,
        trim: true,
        lowercase: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    icon: {
        type: String,
        default: 'fa-tag',
        trim: true
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
