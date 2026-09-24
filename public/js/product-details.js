/**
 * Pico Picks Product Details Dynamic Renderer (Live API Driven)
 * Phase 3: Dynamic Stock Pill, Color Dropdown Selector, & Max Quantity Limits
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
        const titleElem = document.getElementById('productTitle') || col2.querySelector('h1');
        const priceElem = document.getElementById('productPrice') || col2.querySelector('h4');
        const descElem = document.getElementById('productDesc') || col2.querySelector('p');
        const stockBadge = document.getElementById('productStockBadge');
        const colorGroup = document.getElementById('productColorGroup');
        const colorSelect = document.getElementById('productColorSelect');
        const qtyInput = document.getElementById('productQty') || col2.querySelector('input[type="number"]');
        const addToCartBtn = document.getElementById('addToCartBtn') || col2.querySelector('.btn');
        const stockWarning = document.getElementById('stockWarning');

        if (titleElem) titleElem.textContent = product.name;
        if (priceElem) priceElem.textContent = `$${Number(product.price).toFixed(2)}`;

        if (descElem) {
            const formattedDesc = escapeHTML(product.description || 'No description available for this item.').replace(/\n/g, '<br>');
            descElem.innerHTML = formattedDesc;
        }

        // 1. Stock Status Logic
        const stock = (product.stock !== undefined && product.stock !== null) ? Number(product.stock) : 0;

        if (stockBadge) {
            if (stock > 5) {
                stockBadge.className = 'stock-status-badge in-stock';
                stockBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> In Stock (${stock} available)`;
            } else if (stock > 0) {
                stockBadge.className = 'stock-status-badge low-stock';
                stockBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Only ${stock} unit${stock > 1 ? 's' : ''} left in stock - order soon!`;
            } else {
                stockBadge.className = 'stock-status-badge out-of-stock';
                stockBadge.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Currently Out of Stock`;
            }
        }

        // 2. Color Selection Logic
        let colors = [];
        if (Array.isArray(product.colors)) {
            colors = product.colors.map(c => String(c).trim()).filter(Boolean);
        } else if (typeof product.colors === 'string' && product.colors.trim()) {
            colors = product.colors.split(',').map(c => c.trim()).filter(Boolean);
        }

        if (colorGroup && colorSelect) {
            if (colors.length > 0) {
                colorGroup.style.display = 'block';
                colorSelect.innerHTML = colors.map((col, idx) => `
                    <option value="${escapeHTML(col)}" ${idx === 0 ? 'selected' : ''}>${escapeHTML(col)}</option>
                `).join('');
            } else {
                colorGroup.style.display = 'none';
            }
        }

        // 3. Quantity Limits & Out of Stock Handlers
        if (qtyInput) {
            if (stock <= 0) {
                qtyInput.value = '0';
                qtyInput.min = '0';
                qtyInput.max = '0';
                qtyInput.disabled = true;
            } else {
                qtyInput.disabled = false;
                qtyInput.min = '1';
                qtyInput.max = String(stock);
                qtyInput.value = '1';
            }

            function validateQuantity() {
                if (stock <= 0) {
                    qtyInput.value = '0';
                    return 0;
                }

                let val = parseInt(qtyInput.value, 10);
                if (isNaN(val) || val < 1) {
                    val = 1;
                    qtyInput.value = '1';
                }

                if (val > stock) {
                    val = stock;
                    qtyInput.value = String(stock);
                    if (stockWarning) {
                        stockWarning.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Maximum available quantity is ${stock}.`;
                        stockWarning.style.display = 'flex';
                        setTimeout(() => {
                            if (stockWarning) stockWarning.style.display = 'none';
                        }, 3500);
                    }
                } else {
                    if (stockWarning) stockWarning.style.display = 'none';
                }
                return val;
            }

            qtyInput.addEventListener('input', validateQuantity);
            qtyInput.addEventListener('change', validateQuantity);
        }

        if (addToCartBtn) {
            if (stock <= 0) {
                addToCartBtn.classList.add('btn-disabled');
                addToCartBtn.textContent = 'Out of Stock';
            } else {
                addToCartBtn.classList.remove('btn-disabled');
                addToCartBtn.textContent = 'Add To Cart';
            }

            addToCartBtn.onclick = async function(e) {
                e.preventDefault();

                if (stock <= 0) {
                    alert('Sorry, this item is currently out of stock.');
                    return;
                }

                const qty = qtyInput ? (Math.min(stock, Math.max(1, parseInt(qtyInput.value, 10) || 1))) : 1;
                const selectedColor = (colorSelect && colorGroup && colorGroup.style.display !== 'none') ? colorSelect.value : null;

                if (typeof addToCart === 'function') {
                    await addToCart(product.id || product._id, qty, selectedColor);
                } else if (window.API && API.addToCart) {
                    try {
                        await API.addToCart(product.id || product._id, qty);
                        const colorNotice = selectedColor ? ` (Color: ${selectedColor})` : '';
                        alert(`Added ${qty} x "${product.name}"${colorNotice} to your cart!`);
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
