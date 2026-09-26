/**
 * Pico Picks Product Loader & Catalog Script (Live API Driven)
 */

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function renderRatingStars(rating) {
    let stars = '';
    const numRating = Number(rating) || 5;
    const fullStars = Math.floor(numRating);
    const hasHalf = (numRating % 1) >= 0.5;
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fa-solid fa-star"></i>\n';
    }
    if (hasHalf) {
        stars += '<i class="fa-solid fa-star-half-stroke"></i>\n';
    }
    const renderedCount = fullStars + (hasHalf ? 1 : 0);
    for (let i = renderedCount; i < 5; i++) {
        stars += '<i class="fa-regular fa-star"></i>\n';
    }
    return stars;
}

function toggleWishlistCard(btnEl, productJson) {
    try {
        const prod = typeof productJson === 'string' ? JSON.parse(decodeURIComponent(productJson)) : productJson;
        if (typeof toggleWishlist === 'function') {
            toggleWishlist(prod, btnEl);
        }
    } catch (e) {
        console.error('Wishlist card toggle error:', e);
    }
}
window.toggleWishlistCard = toggleWishlistCard;

async function handleDirectAddToCart(productId, encodedColor, btnEl) {
    const color = encodedColor ? decodeURIComponent(encodedColor) : null;
    const originalHTML = btnEl ? btnEl.innerHTML : '';
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
    }

    try {
        if (typeof window.addToCart === 'function') {
            await window.addToCart(productId, 1, color);
        } else if (window.API && typeof window.API.addToCart === 'function' && window.API.getToken()) {
            await window.API.addToCart(productId, 1, color || '');
            if (typeof showToast === 'function') {
                showToast(`Item added to your cart!${color ? ` (Color: ${color})` : ''}`, 'success');
            }
            window.dispatchEvent(new Event('pico_cart_updated'));
            if (window.updateCartNavBadges) window.updateCartNavBadges();
        } else {
            // LocalStorage fallback for guests
            const CART_STORAGE_KEY = 'pico_cart';
            let cart = [];
            try {
                const stored = localStorage.getItem(CART_STORAGE_KEY);
                cart = stored ? JSON.parse(stored) : [];
            } catch (e) {
                cart = [];
            }
            const existing = cart.find(i => (i.productId === productId || i.id === productId) && (!color || i.color === color));
            if (existing) {
                existing.quantity = (existing.quantity || 1) + 1;
            } else {
                cart.push({ productId, quantity: 1, ...(color ? { color } : {}) });
            }
            try {
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
            } catch (e) {
                console.error('Failed to save local cart:', e);
            }
            if (typeof showToast === 'function') {
                showToast(`Item added to your cart!${color ? ` (Color: ${color})` : ''}`, 'info');
            }
            window.dispatchEvent(new Event('pico_cart_updated'));
            if (window.updateCartNavBadges) window.updateCartNavBadges();
        }

        if (btnEl) {
            btnEl.innerHTML = '<i class="fa-solid fa-check"></i> Added!';
            setTimeout(() => {
                btnEl.disabled = false;
                btnEl.innerHTML = originalHTML;
            }, 1200);
        }
    } catch (err) {
        console.error('Direct add to cart error:', err);
        showToast('Could not add to cart: ' + err.message, 'error');
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.innerHTML = originalHTML;
        }
    }
}
window.handleDirectAddToCart = handleDirectAddToCart;

function createProductCard(product) {
    const prodId = String(product.id || product._id);
    const isWished = (typeof isInWishlist === 'function') ? isInWishlist(prodId) : false;
    const heartIconClass = isWished ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    const activeClass = isWished ? 'in-wishlist' : '';
    const defaultColor = (Array.isArray(product.colors) && product.colors.length > 0) ? product.colors[0] : '';
    const stock = Number(product.stock) >= 0 ? Number(product.stock) : 10;
    const isOutOfStock = stock <= 0;

    const safeProductData = encodeURIComponent(JSON.stringify({
        id: prodId,
        name: product.name,
        price: product.price,
        image: product.image,
        colors: product.colors || []
    }));

    return `
        <div class="col-4 product-card-container">
            <button type="button" class="product-wishlist-btn ${activeClass}" 
                onclick="event.stopPropagation(); toggleWishlistCard(this, '${safeProductData}')" 
                title="${isWished ? 'Remove from Wishlist' : 'Add to Wishlist'}" 
                aria-label="Wishlist">
                <i class="${heartIconClass}"></i>
            </button>
            <a href="product-details.html?id=${encodeURIComponent(prodId)}">
                <img src="${product.image}" alt="${escapeHTML(product.name)}" onerror="this.src='images/logo.png'">
            </a>
            <a href="product-details.html?id=${encodeURIComponent(prodId)}">
                <h4>${escapeHTML(product.name)}</h4>
            </a>
            <div class="rating">
                ${renderRatingStars(product.rating)}
            </div>
            <p>৳${Number(product.price).toFixed(2)}</p>
            <button type="button" class="btn-card-add-cart" 
                ${isOutOfStock ? 'disabled' : ''}
                onclick="event.stopPropagation(); handleDirectAddToCart('${prodId}', '${encodeURIComponent(defaultColor)}', this)" 
                title="${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}">
                <i class="fa-solid fa-cart-plus"></i> ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
        </div>
    `;
}

/**
 * Fetch products dynamically from Node.js/Express API
 */
async function fetchProductsData(params = {}) {
    try {
        let products = [];
        if (window.API && typeof window.API.getProducts === 'function') {
            products = await window.API.getProducts(params);
        } else {
            const res = await fetch('/api/products');
            const ct = res.headers.get('content-type') || '';
            products = ct.includes('application/json') ? await res.json() : [];
        }

        if (!Array.isArray(products)) {
            products = [];
        }

        let list = [...products];

        // Filter category if requested
        if (params.category === 'featured') {
            list = list.filter(p => p.isFeatured);
        } else if (params.category === 'latest') {
            list = list.filter(p => p.isLatest);
        }

        // Apply sorting
        if (params.sort === 'Sort by Price' || params.sort === 'price') {
            list.sort((a, b) => a.price - b.price);
        } else if (params.sort === 'Sort by Name' || params.sort === 'name') {
            list.sort((a, b) => a.name.localeCompare(b.name));
        } else if (params.sort === 'Sort by Rating' || params.sort === 'rating') {
            list.sort((a, b) => b.rating - a.rating);
        }

        return list;
    } catch (error) {
        console.error('Failed to fetch products from backend API:', error);
        return [];
    }
}

/**
 * Populate Featured & Latest grids on Index (Home) Page
 */
async function initIndexPage() {
    const headings = document.querySelectorAll('.small-container h2.title');
    for (const heading of headings) {
        const titleText = heading.textContent.trim().toLowerCase();
        if (titleText.includes('featured products')) {
            const rowContainer = heading.nextElementSibling;
            if (rowContainer && (rowContainer.classList.contains('row') || rowContainer.classList.contains('featured-products-grid'))) {
                let featured = await fetchProductsData({ category: 'featured' });
                if (!featured || featured.length === 0) {
                    const all = await fetchProductsData();
                    featured = all.slice(0, 8);
                } else if (featured.length < 8) {
                    const all = await fetchProductsData();
                    const existingIds = new Set(featured.map(f => String(f.id || f._id)));
                    for (const item of all) {
                        if (!existingIds.has(String(item.id || item._id))) {
                            featured.push(item);
                            if (featured.length === 8) break;
                        }
                    }
                } else if (featured.length > 8) {
                    featured = featured.slice(0, 8);
                }
                rowContainer.className = 'row featured-products-grid';
                rowContainer.innerHTML = featured.length > 0
                    ? featured.map(createProductCard).join('')
                    : '<p style="text-align:center; width:100%; color:#999; padding:20px;">No featured products found.</p>';
            }
        } else if (titleText.includes('latest products')) {
            const rowContainer = heading.nextElementSibling;
            if (rowContainer && rowContainer.classList.contains('row')) {
                const latest = await fetchProductsData({ category: 'latest' });
                rowContainer.innerHTML = latest.length > 0
                    ? latest.map(createProductCard).join('')
                    : '<p style="text-align:center; width:100%; color:#999; padding:20px;">No latest products found.</p>';
            }
        }
    }
}

/**
 * Populate Products Grid on Products Catalog Page with Interactive Category Filtering
 */
async function initProductsPage() {
    const selectElem = document.querySelector('.small-container .row-2 select');
    const smallContainers = document.querySelectorAll('.small-container');
    let targetContainer = null;

    smallContainers.forEach(container => {
        if (container.querySelector('.row-2')) {
            targetContainer = container;
        }
    });

    if (!targetContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');

    let currentCategory = 'all';
    let currentSort = selectElem ? selectElem.value : 'Default Sorting';
    let allProducts = [];

    const categoryTabs = document.querySelectorAll('.category-filter-bar .cat-filter-btn');
    const titleEl = document.getElementById('catalogTitle') || targetContainer.querySelector('.row-2 h2.title');

    const categoryNames = {
        'all': 'All Products',
        'sports': 'Sports & Supercars',
        'muscle': 'Muscle & JDM',
        'classic': 'Vintage Classics',
        'accessories': 'Collectible Accessories'
    };

    async function renderGrid() {
        const row2 = targetContainer.querySelector('.row-2');
        const pageBtn = targetContainer.querySelector('.page-btn');

        // Remove existing product rows
        let child = row2 ? row2.nextElementSibling : null;
        while (child && child !== pageBtn) {
            const next = child.nextElementSibling;
            if (child.classList.contains('row')) {
                child.remove();
            }
            child = next;
        }

        if (allProducts.length === 0) {
            allProducts = await fetchProductsData();
        }

        let productsToRender = allProducts.filter(p => matchProductCategory(p, currentCategory));

        if (searchQuery && currentCategory === 'all') {
            const q = searchQuery.toLowerCase();
            productsToRender = productsToRender.filter(p => {
                const name = (p.name || '').toLowerCase();
                const desc = (p.description || '').toLowerCase();
                const cat = (p.category || '').toLowerCase();
                return name.includes(q) || desc.includes(q) || cat.includes(q);
            });
            if (titleEl) {
                titleEl.textContent = `Search Results for "${searchQuery}" (${productsToRender.length})`;
            }
        } else if (titleEl && categoryNames[currentCategory]) {
            titleEl.textContent = categoryNames[currentCategory];
        }

        // Apply sorting
        if (currentSort === 'Sort by Price' || currentSort === 'price') {
            productsToRender.sort((a, b) => a.price - b.price);
        } else if (currentSort === 'Sort by Name' || currentSort === 'name') {
            productsToRender.sort((a, b) => a.name.localeCompare(b.name));
        } else if (currentSort === 'Sort by Rating' || currentSort === 'rating') {
            productsToRender.sort((a, b) => b.rating - a.rating);
        }

        const gridRow = document.createElement('div');
        gridRow.className = 'row';
        gridRow.innerHTML = productsToRender.length > 0
            ? productsToRender.map(createProductCard).join('')
            : '<p style="text-align:center; width:100%; color:#999; padding:40px;">No products found matching your selection.</p>';

        if (pageBtn) {
            targetContainer.insertBefore(gridRow, pageBtn);
        } else {
            targetContainer.appendChild(gridRow);
        }
    }

    // Category tab button click listeners
    categoryTabs.forEach(btn => {
        btn.addEventListener('click', async () => {
            categoryTabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.getAttribute('data-category') || 'all';
            await renderGrid();
        });
    });

    // Attach sort change listener
    if (selectElem) {
        selectElem.addEventListener('change', async function(e) {
            currentSort = e.target.value;
            await renderGrid();
        });
    }

    // Initial render
    await renderGrid();
}

/**
 * Category Explorer on Homepage
 */
function matchProductCategory(product, category) {
    if (!category || category === 'all') return true;
    
    const cat = (product.category || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    const desc = (product.description || '').toLowerCase();
    const fullText = `${name} ${desc} ${cat}`;

    if (category === 'sports') {
        return /ferrari|bmw|m4|brabus|turbo|rc|porsche|lamborghini|supercar|sports/i.test(fullText);
    } else if (category === 'muscle') {
        return /mustang|dodge|challenger|hellcat|ae86|gt-r|gtr|nissan|toyota supra|muscle|jdm/i.test(fullText);
    } else if (category === 'classic') {
        return /1936|mercedes-benz 500k|300 sl|miniature t1|classic|vintage|roadster|gullwing/i.test(fullText);
    } else if (category === 'accessories') {
        return /slingshot|pen holder|money bank|spinner|book|accessory|accessories|watch|keychain|toy/i.test(fullText);
    }
    return true;
}

async function initCategoryExplorer() {
    const row = document.getElementById('categoryProductsRow');
    if (!row) return;

    const navButtons = document.querySelectorAll('.cat-filter-btn');
    let allProducts = await fetchProductsData();

    function renderCategory(cat) {
        let filtered = allProducts.filter(p => matchProductCategory(p, cat));
        if (cat === 'all') {
            // Strictly 3 lines (3 rows x 4 items = 12 items on desktop)
            filtered = filtered.slice(0, 12);
        }
        if (filtered.length === 0) {
            row.innerHTML = '<p style="text-align:center; width:100%; color:#999; padding:30px;">No products found in this category.</p>';
        } else {
            row.innerHTML = filtered.map(createProductCard).join('');
        }
    }

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.getAttribute('data-category') || 'all';
            renderCategory(cat);
        });
    });

    // Initial render
    renderCategory('all');
}

document.addEventListener('DOMContentLoaded', async function() {
    if (document.querySelector('.small-container .row-2 select') || window.location.pathname.includes('products.html')) {
        await initProductsPage();
    }

    const headings = document.querySelectorAll('.small-container h2.title');
    let isIndexPage = false;
    headings.forEach(h => {
        if (h.textContent.trim().toLowerCase().includes('featured products')) {
            isIndexPage = true;
        }
    });
    if (isIndexPage) {
        await initIndexPage();
    }

    if (document.getElementById('categoryProductsRow')) {
        await initCategoryExplorer();
    }
});
