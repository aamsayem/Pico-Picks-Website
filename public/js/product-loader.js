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

function createProductCard(product) {
    const prodId = product.id || product._id;
    return `
        <div class="col-4">
            <a href="product-details.html?id=${encodeURIComponent(prodId)}">
                <img src="${product.image}" alt="${escapeHTML(product.name)}" onerror="this.src='images/logo.png'">
            </a>
            <a href="product-details.html?id=${encodeURIComponent(prodId)}">
                <h4>${escapeHTML(product.name)}</h4>
            </a>
            <div class="rating">
                ${renderRatingStars(product.rating)}
            </div>
            <p>$${Number(product.price).toFixed(2)}</p>
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
            products = await res.json();
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
            if (rowContainer && rowContainer.classList.contains('row')) {
                const featured = await fetchProductsData({ category: 'featured' });
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
 * Populate Products Grid on Products Catalog Page
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

    async function renderGrid(sortCriteria) {
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

        const productsToRender = await fetchProductsData({ sort: sortCriteria });

        const gridRow = document.createElement('div');
        gridRow.className = 'row';
        gridRow.innerHTML = productsToRender.length > 0
            ? productsToRender.map(createProductCard).join('')
            : '<p style="text-align:center; width:100%; color:#999; padding:40px;">No products available in the catalog.</p>';

        if (pageBtn) {
            targetContainer.insertBefore(gridRow, pageBtn);
        } else {
            targetContainer.appendChild(gridRow);
        }
    }

    // Initial render
    await renderGrid(selectElem ? selectElem.value : 'Default Sorting');

    // Attach sort change listener
    if (selectElem) {
        selectElem.addEventListener('change', async function(e) {
            await renderGrid(e.target.value);
        });
    }
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
});
