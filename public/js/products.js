/**
 * Pico Picks Product Catalog Data
 */
const PRODUCTS = [
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
