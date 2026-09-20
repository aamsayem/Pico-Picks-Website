/**
 * Pico Picks Product Loader & Sorting Script (Full-Stack API + Local Fallback)
 */

function createProductCard(product) {
    return `
        <div class="col-4">
            <a href="product-details.html?id=${encodeURIComponent(product.id)}">
                <img src="${product.image}" alt="${escapeHTML(product.name)}">
            </a>
            <a href="product-details.html?id=${encodeURIComponent(product.id)}">
                <h4>${escapeHTML(product.name)}</h4>
            </a>
            <div class="rating">
                ${renderRatingStars(product.rating)}
            </div>
            <p>$${Number(product.price).toFixed(2)}</p>
        </div>
    `;
}

function renderRatingStars(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalf = (rating % 1) >= 0.5;
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

async function fetchProductsData(params = {}) {
    if (window.API && typeof window.API.getProducts === 'function') {
        try {
            return await window.API.getProducts(params);
        } catch (e) {
            console.warn('Backend API unavailable, falling back to local products array:', e.message);
        }
    }
    
    // Fallback to local PRODUCTS array
    if (typeof PRODUCTS !== 'undefined') {
        let list = [...PRODUCTS];
        if (params.category === 'featured') {
            list = list.filter(p => p.isFeatured);
        } else if (params.category === 'latest') {
            list = list.filter(p => p.isLatest);
        }
        if (params.sort === 'Sort by Price' || params.sort === 'price') {
            list.sort((a, b) => a.price - b.price);
        } else if (params.sort === 'Sort by Name' || params.sort === 'name') {
            list.sort((a, b) => a.name.localeCompare(b.name));
        } else if (params.sort === 'Sort by Rating' || params.sort === 'rating') {
            list.sort((a, b) => b.rating - a.rating);
        }
        return list;
    }
    return [];
}

async function initIndexPage() {
    const headings = document.querySelectorAll('.small-container h2.title');
    for (const heading of headings) {
        const titleText = heading.textContent.trim().toLowerCase();
        if (titleText.includes('featured products')) {
            const rowContainer = heading.nextElementSibling;
            if (rowContainer && rowContainer.classList.contains('row')) {
                const featured = await fetchProductsData({ category: 'featured' });
                rowContainer.innerHTML = featured.map(createProductCard).join('');
            }
        } else if (titleText.includes('latest products')) {
            const rowContainer = heading.nextElementSibling;
            if (rowContainer && rowContainer.classList.contains('row')) {
                const latest = await fetchProductsData({ category: 'latest' });
                rowContainer.innerHTML = latest.map(createProductCard).join('');
            }
        }
    }
}

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
        gridRow.innerHTML = productsToRender.map(createProductCard).join('');

        if (pageBtn) {
            targetContainer.insertBefore(gridRow, pageBtn);
        } else {
            targetContainer.appendChild(gridRow);
        }
    }

    // Initial render
    await renderGrid(selectElem ? selectElem.value : 'Default Sorting');

    // Attach listener
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
