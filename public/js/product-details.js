/**
 * Pico Picks Product Details Dynamic Renderer (Full-Stack API + Local Fallback)
 */

document.addEventListener('DOMContentLoaded', async function() {
    const singleProductContainer = document.querySelector('.single-product');
    if (!singleProductContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id') || 'bmw-m4-gt3-special';

    let product = null;

    // Fetch from backend API
    if (window.API && typeof window.API.getProductById === 'function') {
        try {
            product = await window.API.getProductById(productId);
        } catch (e) {
            console.warn('API error fetching product details, falling back:', e.message);
        }
    }

    // Fallback to local PRODUCTS array
    if (!product && typeof PRODUCTS !== 'undefined') {
        product = PRODUCTS.find(p => p.id === productId) || PRODUCTS[0];
    }

    if (!product) return;

    document.title = `${product.name} - Pico Picks`;

    const mainImg = document.getElementById('product-img');
    const smallImgRow = singleProductContainer.querySelector('.small-img-row');
    const col2 = singleProductContainer.querySelectorAll('.col-2')[1];

    if (mainImg) {
        mainImg.src = product.image;
        mainImg.alt = product.name;
    }

    if (smallImgRow && product.images && product.images.length > 0) {
        smallImgRow.innerHTML = product.images.map(imgSrc => `
            <div class="small-img-col">
                <img src="${imgSrc}" width="100%" class="small-img" alt="${escapeHTML(product.name)}">
            </div>
        `).join('');

        const smallImgs = smallImgRow.getElementsByClassName('small-img');
        Array.from(smallImgs).forEach(img => {
            img.onclick = function() {
                if (mainImg) {
                    mainImg.src = this.src;
                }
            };
        });
    }

    if (col2) {
        const titleElem = col2.querySelector('h1');
        const priceElem = col2.querySelector('h4');
        const qtyInput = col2.querySelector('input[type="number"]');
        const addToCartBtn = col2.querySelector('.btn');
        const descElem = col2.querySelector('p');

        if (titleElem) titleElem.textContent = product.name;
        if (priceElem) priceElem.textContent = `$${Number(product.price).toFixed(2)}`;
        if (qtyInput) {
            qtyInput.value = 1;
            qtyInput.min = 1;
        }

        if (descElem) {
            const formattedDesc = escapeHTML(product.description).replace(/\n/g, '<br>');
            descElem.innerHTML = formattedDesc;
        }

        if (addToCartBtn) {
            addToCartBtn.onclick = async function(e) {
                e.preventDefault();
                const qty = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;
                if (typeof addToCart === 'function') {
                    await addToCart(product.id, qty);
                }
            };
        }
    }

    await renderRelatedProducts(product.id);
});

async function renderRelatedProducts(currentProductId) {
    const smallContainers = document.querySelectorAll('.small-container');
    let relatedRow = null;

    smallContainers.forEach(container => {
        const heading = container.querySelector('h2');
        if (heading && heading.textContent.trim().toLowerCase().includes('related products')) {
            const nextContainer = container.nextElementSibling;
            if (nextContainer && nextContainer.classList.contains('small-container')) {
                relatedRow = nextContainer.querySelector('.row');
            } else {
                relatedRow = container.querySelector('.row');
            }
        }
    });

    if (!relatedRow) return;

    let allProducts = [];
    if (window.API && typeof window.API.getProducts === 'function') {
        try {
            allProducts = await window.API.getProducts();
        } catch (e) {
            // fallback
        }
    }

    if (allProducts.length === 0 && typeof PRODUCTS !== 'undefined') {
        allProducts = PRODUCTS;
    }

    const relatedProducts = allProducts.filter(p => p.id !== currentProductId).slice(0, 4);

    relatedRow.innerHTML = relatedProducts.map(p => `
        <div class="col-4">
            <a href="product-details.html?id=${encodeURIComponent(p.id)}">
                <img src="${p.image}" alt="${escapeHTML(p.name)}">
            </a>
            <a href="product-details.html?id=${encodeURIComponent(p.id)}">
                <h4>${escapeHTML(p.name)}</h4>
            </a>
            <div class="rating">
                ${renderRatingStars(p.rating)}
            </div>
            <p>$${Number(p.price).toFixed(2)}</p>
        </div>
    `).join('');
}
