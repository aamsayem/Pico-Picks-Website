/**
 * Product Controller - Handlers for fetching products and seeding database
 */

const mongoose = require('mongoose');
const Product = require('../models/Product');

const INITIAL_PRODUCTS = [
    {
        id: "bmw-m4-gt3-special",
        name: "BMW M4 GT3 Special",
        price: 1000.00,
        rating: 5,
        isFeatured: true,
        isLatest: false,
        image: "images/product/BMW M4 GT3 Special1.jpg",
        images: [
            "images/product/BMW M4 GT3 Special1.jpg",
            "images/product/BMW M4 GT3 Special1.1.jpg",
            "images/product/BMW M4 GT3 Special1.2.jpg",
            "images/product/BMW M4 GT3 Special1.3.jpg"
        ],
        description: "- Realistic Die-Cast Design: Acrylic Pack Gulf BMW M4 GT3 RS Blue Finely detailed body, headlights, and interiors make it look like a real vintage car.\n- High-Quality Material: Crafted from premium metal and sturdy plastic parts for durability and long-lasting use.\n- Smooth Rolling Wheels: Ensures easy movement and fun play experience for kids on any surface.\n- Perfect Gift for Kids & Collectors: A great collectible or gift idea for birthdays, parties, and special occasions."
    },
    {
        id: "slingshot",
        name: "Slingshot",
        price: 600.00,
        rating: 5,
        isFeatured: true,
        isLatest: false,
        image: "images/product/Slingshot.jpg",
        images: ["images/product/Slingshot.jpg"],
        description: "High-precision tactical slingshot built with heavy-duty alloy frame and ergonomic non-slip grip. Ideal for outdoor recreational shooting and collectors."
    },
    {
        id: "1936-mercedes-benz-500k",
        name: "1936 Mercedes-Benz 500K Special Roadster",
        price: 1800.00,
        rating: 5,
        isFeatured: true,
        isLatest: false,
        image: "images/product/1936 Mercedes-Benz 500K Special Roadster.jpg",
        images: ["images/product/1936 Mercedes-Benz 500K Special Roadster.jpg"],
        description: "Exquisite 1936 Mercedes-Benz 500K Special Roadster die-cast replica with openable doors, realistic interior dashboard, and authentic chrome accents."
    },
    {
        id: "dodge-challenger-srt-hellcat",
        name: "Dodge Challenger SRT Hellacat",
        price: 1800.00,
        rating: 5,
        isFeatured: true,
        isLatest: false,
        image: "images/product/Dodge Challenger SRT Hellacat.jpg",
        images: ["images/product/Dodge Challenger SRT Hellacat.jpg"],
        description: "Aggressive muscle car scale replica of the iconic Dodge Challenger SRT Hellcat featuring high-detail engine bay and realistic rubber tires."
    },
    {
        id: "ford-mustang-gt",
        name: "Ford mustang GT",
        price: 1000.00,
        rating: 5,
        isFeatured: false,
        isLatest: true,
        image: "images/product/Ford mustang GT.jpg",
        images: ["images/product/Ford mustang GT.jpg"],
        description: "Classic American muscle car replica of the Ford Mustang GT with glossy metallic coat and detailed interior styling."
    },
    {
        id: "laferrari-bburago",
        name: "Lafrarri burago",
        price: 600.00,
        rating: 5,
        isFeatured: false,
        isLatest: true,
        image: "images/product/Lafrarri burago.jpg",
        images: ["images/product/Lafrarri burago.jpg"],
        description: "Officially licensed Bburago LaFerrari 1:24 scale die-cast sports car featuring authentic Ferrari red finish and precision opening doors."
    },
    {
        id: "benz-300-sl",
        name: "Benz 300 SL",
        price: 800.00,
        rating: 5,
        isFeatured: false,
        isLatest: true,
        image: "images/product/Benz 300 SL.jpg",
        images: ["images/product/Benz 300 SL.jpg"],
        description: "Timeless Mercedes-Benz 300 SL Gullwing classic collector's item with functional gullwing doors and vintage chrome grille."
    },
    {
        id: "mercedes-benz-brabus-g800",
        name: "Mercedes-Benz Brabus G800",
        price: 1800.00,
        rating: 5,
        isFeatured: false,
        isLatest: true,
        image: "images/product/Mercedes-Benz Brabus G800.jpg",
        images: ["images/product/Mercedes-Benz Brabus G800.jpg"],
        description: "Luxury off-road Brabus G800 SUV die-cast model with functional lights, opening hood, and realistic sound effects."
    },
    {
        id: "popup-book",
        name: "Popup Book",
        price: 250.00,
        rating: 5,
        isFeatured: false,
        isLatest: false,
        image: "images/product/popup book.jpg",
        images: ["images/product/popup book.jpg"],
        description: "Intricately engineered 3D papercraft pop-up book designed for car enthusiasts and collectors of unique automotive literature."
    },
    {
        id: "miniature-t1",
        name: "Miniature T1",
        price: 120.00,
        rating: 4,
        isFeatured: false,
        isLatest: false,
        image: "images/product/miniature t1.jpg",
        images: ["images/product/miniature t1.jpg"],
        description: "Retro Volkswagen T1 Transporter camper bus miniature model featuring nostalgic two-tone color finish."
    },
    {
        id: "ae86-big",
        name: "AE86 Big",
        price: 700.00,
        rating: 5,
        isFeatured: false,
        isLatest: false,
        image: "images/product/AE86 big.jpg",
        images: ["images/product/AE86 big.jpg"],
        description: "Legendary Toyota Sprinter Trueno AE86 Initial D drift car die-cast model with pop-up headlights and authentic tofu shop decals."
    },
    {
        id: "dodge-bw",
        name: "Dodge BW",
        price: 1800.00,
        rating: 5,
        isFeatured: false,
        isLatest: false,
        image: "images/product/Dodge BW.jpg",
        images: ["images/product/Dodge BW.jpg"],
        description: "Black and White special edition Dodge muscle car die-cast model for true motorsport fans."
    },
    {
        id: "dodge-blue",
        name: "Dodge Blue",
        price: 1800.00,
        rating: 5,
        isFeatured: false,
        isLatest: false,
        image: "images/product/Dodge Blue.jpg",
        images: ["images/product/Dodge Blue.jpg"],
        description: "Special electric blue Dodge muscle car die-cast model featuring realistic wheel suspension and high-performance racing stripes."
    },
    {
        id: "money-bank",
        name: "Money Bank",
        price: 320.00,
        rating: 4,
        isFeatured: false,
        isLatest: false,
        image: "images/product/Money Bank.jpg",
        images: ["images/product/Money Bank.jpg"],
        description: "Decorative car-shaped ceramic and alloy coin savings bank. Perfect desktop accent for automotive enthusiasts."
    },
    {
        id: "ferrari-f50-bburago",
        name: "Ferarri F50 burago",
        price: 800.00,
        rating: 5,
        isFeatured: false,
        isLatest: false,
        image: "images/product/Ferarri F50 burago.jpg",
        images: ["images/product/Ferarri F50 burago.jpg"],
        description: "Premium Bburago Ferrari F50 scale model featuring detailed V12 engine display and authentic race body lines."
    },
    {
        id: "pen-holder",
        name: "Pen holder",
        price: 350.00,
        rating: 4,
        isFeatured: false,
        isLatest: false,
        image: "images/product/Pen holder.jpg",
        images: ["images/product/Pen holder.jpg"],
        description: "Premium automotive-themed desk pen holder constructed from solid die-cast metal parts."
    },
    {
        id: "spinner-key-ring",
        name: "Spinner key ring",
        price: 120.00,
        rating: 5,
        isFeatured: false,
        isLatest: false,
        image: "images/product/Spinner key ring.jpg",
        images: ["images/product/Spinner key ring.jpg"],
        description: "Interactive metal turbocharger/wheel spinner keychain with smooth ball-bearing spin action."
    },
    {
        id: "ferrari",
        name: "Ferrari",
        price: 1800.00,
        rating: 5,
        isFeatured: false,
        isLatest: false,
        image: "images/product/Ferrari.jpg",
        images: ["images/product/Ferrari.jpg"],
        description: "Classic red Ferrari die-cast supercar model with sleek aerodynamics and luxury interior finish."
    }
];

// @desc    Fetch all products with optional sorting and filtering
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    try {
        let filter = {};
        if (req.query.category === 'featured' || req.query.isFeatured === 'true') {
            filter.isFeatured = true;
        } else if (req.query.category === 'latest' || req.query.isLatest === 'true') {
            filter.isLatest = true;
        }

        let query = Product.find(filter);

        // Sorting
        if (req.query.sort === 'price' || req.query.sort === 'Sort by Price') {
            query = query.sort({ price: 1 });
        } else if (req.query.sort === 'name' || req.query.sort === 'Sort by Name') {
            query = query.sort({ name: 1 });
        } else if (req.query.sort === 'rating' || req.query.sort === 'Sort by Rating') {
            query = query.sort({ rating: -1 });
        }

        let products = await query.exec();

        // Fallback: If DB is empty, auto-seed and return initial catalog
        if (products.length === 0 && Object.keys(filter).length === 0) {
            await Product.insertMany(INITIAL_PRODUCTS);
            products = await Product.find({});
        }

        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
};

// Helper: Locate product by custom slug id OR MongoDB _id
const findProductByIdOrSlug = async (idParam) => {
    if (!idParam) return null;
    let product = await Product.findOne({ id: idParam });
    if (!product && mongoose.Types.ObjectId.isValid(idParam)) {
        product = await Product.findById(idParam);
    }
    return product;
};

// @desc    Fetch single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
    try {
        const product = await findProductByIdOrSlug(req.params.id);
        if (product) {
            return res.json(product);
        }

        // Check fallback initial array
        const fallback = INITIAL_PRODUCTS.find(p => p.id === req.params.id);
        if (fallback) {
            return res.json(fallback);
        }

        return res.status(404).json({ error: 'Product not found' });
    } catch (error) {
        console.error('Error fetching product:', error);
        return res.status(500).json({ error: 'Failed to fetch product' });
    }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
    try {
        const {
            name,
            price,
            image,
            images,
            description,
            rating,
            isFeatured,
            isLatest,
            id
        } = req.body;

        if (!name || price === undefined || !image) {
            return res.status(400).json({ error: 'Product name, price, and primary image are required' });
        }

        // Generate unique slug id if not explicitly provided
        let slugId = id;
        if (!slugId) {
            const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product';
            slugId = `${baseSlug}-${Date.now().toString(36)}`;
        }

        // Ensure unique id slug
        const existingProduct = await Product.findOne({ id: slugId });
        if (existingProduct) {
            slugId = `${slugId}-${Date.now().toString(36)}`;
        }

        const product = await Product.create({
            id: slugId,
            name: name.trim(),
            price: Number(price),
            image: image.trim(),
            images: Array.isArray(images) && images.length > 0 ? images : [image.trim()],
            description: description || '',
            rating: rating !== undefined ? Number(rating) : 5,
            isFeatured: Boolean(isFeatured),
            isLatest: Boolean(isLatest)
        });

        res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: error.message || 'Failed to create product' });
    }
};

// @desc    Update an existing product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
    try {
        const product = await findProductByIdOrSlug(req.params.id);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const {
            name,
            price,
            image,
            images,
            description,
            rating,
            isFeatured,
            isLatest
        } = req.body;

        if (name !== undefined) product.name = name.trim();
        if (price !== undefined) product.price = Number(price);
        if (image !== undefined) product.image = image.trim();
        if (images !== undefined) product.images = Array.isArray(images) ? images : [images];
        if (description !== undefined) product.description = description;
        if (rating !== undefined) product.rating = Number(rating);
        if (isFeatured !== undefined) product.isFeatured = Boolean(isFeatured);
        if (isLatest !== undefined) product.isLatest = Boolean(isLatest);

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: error.message || 'Failed to update product' });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
    try {
        const product = await findProductByIdOrSlug(req.params.id);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await Product.deleteOne({ _id: product._id });
        res.json({ message: 'Product deleted successfully', id: req.params.id });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: error.message || 'Failed to delete product' });
    }
};

// @desc    Seed database with initial products
// @route   POST /api/products/seed
// @access  Public
const seedProducts = async (req, res) => {
    try {
        await Product.deleteMany({});
        const createdProducts = await Product.insertMany(INITIAL_PRODUCTS);
        res.status(201).json({ message: 'Products seeded successfully', count: createdProducts.length });
    } catch (error) {
        res.status(500).json({ error: 'Seeding failed', details: error.message });
    }
};

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    seedProducts
};
