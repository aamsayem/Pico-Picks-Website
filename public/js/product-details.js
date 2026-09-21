/**
 * Pico Picks Product Details Dynamic Renderer (Live API Driven)
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

document.addEventListener('DOMContentLoaded', async function() {
    const singleProductContainer = document.querySelector('.single-product');
    if (!singleProductContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id') || 'bmw-m4-gt3-special';

    let product = null;

    // Fetch from backend API
    try {
        if (window.API && typeof window.API.getProductById === 'function') {
            product = await window.API.getProductById(productId);
        } else {
            const res = await fetch(`/api/products/${productId}`);
            product = await res.json();
        }
    } catch (e) {
        console.error('API error fetching product details:', e.message);
    }

    if (!product || product.error) {
        singleProductContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; width: 100%;">
                <h2>Product Not Found</h2>
                <p style="color: #666; margin: 15px 0;">Sorry, the requested product could not be located in our catalog.</p>
                <a href="products.html" class="btn">Return to Catalog</a>
            </div>
        `;
        return;
    }

    document.title = `${product.name} - Pico Picks`;

    const mainImg = document.getElementById('product-img');
    const smallImgRow = singleProductContainer.querySelector('.small-img-row');
    const col2 = singleProductContainer.querySelectorAll('.col-2')[1];

    if (mainImg) {
        mainImg.src = product.image;
        mainImg.alt = product.name;
    }

    const galleryImages = (Array.isArray(product.images) && product.images.length > 0)
        ? product.images
        : [product.image];

    if (smallImgRow) {
        smallImgRow.innerHTML = galleryImages.map(imgSrc => `
            <div class="small-img-col">
                <img src="${imgSrc}" width="100%" class="small-img" alt="${escapeHTML(product.name)}" onerror="this.src='images/logo.png'">
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
            const formattedDesc = escapeHTML(product.description || 'No description available for this item.').replace(/\n/g, '<br>');
            descElem.innerHTML = formattedDesc;
        }

        if (addToCartBtn) {
            addToCartBtn.onclick = async function(e) {
                e.preventDefault();
                const qty = qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1;
                if (typeof addToCart === 'function') {
                    await addToCart(product.id || product._id, qty);
                } else if (window.API && API.addToCart) {
                    try {
                        await API.addToCart(product.id || product._id, qty);
                        alert(`Added ${qty} x "${product.name}" to your cart!`);
                    } catch (err) {
                        alert(`Could not add to cart: ${err.message}`);
                    }
                }
            };
        }
    }

    await renderRelatedProducts(product.id || product._id);
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
            } else if (container.querySelector('.row')) {
                relatedRow = container.querySelector('.row');
            }
        }
    });

    if (!relatedRow) return;

    try {
        let allProducts = [];
        if (window.API && typeof window.API.getProducts === 'function') {
            allProducts = await window.API.getProducts();
        } else {
            const res = await fetch('/api/products');
            allProducts = await res.json();
        }

        const related = allProducts
            .filter(p => (p.id !== currentProductId && p._id !== currentProductId))
            .slice(0, 4);

        if (related.length > 0) {
            relatedRow.innerHTML = related.map(p => `
                <div class="col-4">
                    <a href="product-details.html?id=${encodeURIComponent(p.id || p._id)}">
                        <img src="${p.image}" alt="${escapeHTML(p.name)}" onerror="this.src='images/logo.png'">
                    </a>
                    <a href="product-details.html?id=${encodeURIComponent(p.id || p._id)}">
                        <h4>${escapeHTML(p.name)}</h4>
                    </a>
                    <div class="rating">
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                        <i class="fa-solid fa-star"></i>
                    </div>
                    <p>$${Number(p.price).toFixed(2)}</p>
                </div>
            `).join('');
        }
    } catch (e) {
        console.warn('Could not load related products:', e.message);
    }
}
