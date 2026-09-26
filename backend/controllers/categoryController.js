/**
 * Category Controller
 * Handles dynamic category listing, seeding defaults, and admin CRUD
 */

const Category = require('../models/Category');
const Product = require('../models/Product');

const DEFAULT_CATEGORIES = [
    {
        name: 'Sports & Supercars',
        slug: 'sports',
        description: 'High-speed aerodynamic supercars and GT racers',
        icon: 'fa-bolt',
        order: 1,
        isActive: true
    },
    {
        name: 'Muscle & JDM',
        slug: 'muscle',
        description: 'V8 powerhouses, quarter-mile beasts, and Japanese drift icons',
        icon: 'fa-gauge-high',
        order: 2,
        isActive: true
    },
    {
        name: 'Classic & Vintage',
        slug: 'classic',
        description: 'Timeless automotive heritage and vintage roadsters',
        icon: 'fa-car-side',
        order: 3,
        isActive: true
    },
    {
        name: 'Accessories',
        slug: 'accessories',
        description: 'Collectible desk gadgets, display accessories, and tactical gear',
        icon: 'fa-wrench',
        order: 4,
        isActive: true
    }
];

// Helper to seed default categories into MongoDB if collection is empty
const seedCategoriesIfNeeded = async () => {
    try {
        const count = await Category.countDocuments();
        if (count === 0) {
            await Category.insertMany(DEFAULT_CATEGORIES);
        }
    } catch (err) {
        console.warn('Category auto-seed notice:', err.message);
    }
};

// @desc    Get all active categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
    try {
        await seedCategoriesIfNeeded();
        let categories = await Category.find().sort({ order: 1, createdAt: 1 });
        if (!categories || categories.length === 0) {
            categories = DEFAULT_CATEGORIES;
        }
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(200).json(DEFAULT_CATEGORIES);
    }
};

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
    try {
        const { name, slug, description, icon, order, isActive } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Category name is required' });
        }

        const generatedSlug = (slug || name)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        if (!generatedSlug) {
            return res.status(400).json({ error: 'Valid category slug or name is required' });
        }

        const existing = await Category.findOne({ slug: generatedSlug });
        if (existing) {
            return res.status(400).json({ error: `Category with slug "${generatedSlug}" already exists` });
        }

        const category = await Category.create({
            name: name.trim(),
            slug: generatedSlug,
            description: description ? description.trim() : '',
            icon: icon ? icon.trim() : 'fa-tag',
            order: order !== undefined ? Number(order) : 0,
            isActive: isActive !== undefined ? Boolean(isActive) : true
        });

        res.status(201).json(category);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: error.message || 'Failed to create category' });
    }
};

// @desc    Update category (name, slug, icon, etc.)
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        let category = null;

        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            category = await Category.findById(id);
        }
        if (!category) {
            category = await Category.findOne({ slug: id });
        }

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const { name, slug, description, icon, order, isActive } = req.body;
        const oldSlug = category.slug;

        if (name !== undefined) category.name = name.trim();
        if (description !== undefined) category.description = description.trim();
        if (icon !== undefined) category.icon = icon.trim();
        if (order !== undefined) category.order = Number(order);
        if (isActive !== undefined) category.isActive = Boolean(isActive);

        if (slug !== undefined && slug.trim() !== '') {
            const newSlug = slug
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');

            if (newSlug && newSlug !== oldSlug) {
                const existing = await Category.findOne({ slug: newSlug });
                if (existing && String(existing._id) !== String(category._id)) {
                    return res.status(400).json({ error: `Slug "${newSlug}" is already taken by another category` });
                }
                category.slug = newSlug;

                // Sync products assigned to the old slug
                try {
                    await Product.updateMany({ category: oldSlug }, { category: newSlug });
                } catch (err) {
                    console.warn('Notice: product category sync error:', err.message);
                }
            }
        }

        await category.save();
        res.status(200).json(category);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: error.message || 'Failed to update category' });
    }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        let category = null;

        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            category = await Category.findById(id);
        }
        if (!category) {
            category = await Category.findOne({ slug: id });
        }

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        await Category.deleteOne({ _id: category._id });
        res.status(200).json({ message: 'Category deleted successfully', id: category._id, slug: category.slug });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: error.message || 'Failed to delete category' });
    }
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    seedCategoriesIfNeeded
};
