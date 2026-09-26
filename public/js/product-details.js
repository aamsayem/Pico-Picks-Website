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

function renderRatingStars(rating) {
    let stars = '';
    const numRating = Number(rating) || 5;
    const fullStars = Math.floor(numRating);
    const hasHalf = (numRating % 1) >= 0.5;
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fa-solid fa-star"></i>';
    }
    if (hasHalf) {
        stars += '<i class="fa-solid fa-star-half-stroke"></i>';
    }
    const renderedCount = fullStars + (hasHalf ? 1 : 0);
    for (let i = renderedCount; i < 5; i++) {
        stars += '<i class="fa-regular fa-star"></i>';
    }
    return stars;
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
            const ct = res.headers.get('content-type') || '';
            product = ct.includes('application/json') ? await res.json() : null;
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

    const galleryImages = (Array.isArray(product.galleryImages) && product.galleryImages.length > 0)
        ? product.galleryImages
        : ((Array.isArray(product.images) && product.images.length > 0) ? product.images : [product.image]);

    let thumbnailList = [...galleryImages];
    if (!thumbnailList.includes(product.image)) {
        thumbnailList = [product.image, ...thumbnailList];
    }
    thumbnailList = thumbnailList.slice(0, 4);

    if (smallImgRow) {
        smallImgRow.innerHTML = thumbnailList.map((imgSrc, idx) => `
            <div class="small-img-col">
                <img src="${imgSrc}" width="100%" class="small-img ${idx === 0 ? 'active-thumb' : ''}" alt="${escapeHTML(product.name)}" onerror="this.src='images/logo.png'">
            </div>
        `).join('');

        const smallImgs = smallImgRow.getElementsByClassName('small-img');
        Array.from(smallImgs).forEach(img => {
            img.onclick = function() {
                if (mainImg) {
                    mainImg.src = this.src;
                }
                Array.from(smallImgs).forEach(i => i.classList.remove('active-thumb'));
                this.classList.add('active-thumb');
            };
        });
    }

    if (col2) {
        const titleElem = document.getElementById('productTitle') || col2.querySelector('h1');
        const priceElem = document.getElementById('productPrice') || col2.querySelector('h4');
        const descElem = document.getElementById('productDesc') || col2.querySelector('p');
        const stockBadge = document.getElementById('productStockBadge');
        const colorGroup = document.getElementById('productColorGroup');
        const colorPillsContainer = document.getElementById('productColorPills');
        const selectedColorInput = document.getElementById('selectedColorInput');
        const selectedColorLabel = document.getElementById('selectedColorLabel');
        const colorWarning = document.getElementById('colorSelectWarning');
        const qtyInput = document.getElementById('productQty') || col2.querySelector('input[type="number"]');
        const addToCartBtn = document.getElementById('addToCartBtn') || col2.querySelector('.btn');
        const stockWarning = document.getElementById('stockWarning');

        if (titleElem) titleElem.textContent = product.name;
        if (priceElem) priceElem.textContent = `৳${Number(product.price).toFixed(2)}`;

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

        // 2. Color Selection Logic (Clickable buttons / pills)
        let colors = [];
        if (Array.isArray(product.colors)) {
            colors = product.colors.map(c => String(c).trim()).filter(Boolean);
        } else if (typeof product.colors === 'string' && product.colors.trim()) {
            colors = product.colors.split(',').map(c => c.trim()).filter(Boolean);
        }

        if (colorGroup && colorPillsContainer) {
            if (colors.length > 0) {
                colorGroup.style.display = 'block';
                colorPillsContainer.innerHTML = colors.map(col => `
                    <button type="button" class="color-pill-btn" data-color="${escapeHTML(col)}">
                        ${escapeHTML(col)}
                    </button>
                `).join('');

                const pills = colorPillsContainer.querySelectorAll('.color-pill-btn');
                pills.forEach(pill => {
                    pill.onclick = function() {
                        pills.forEach(p => p.classList.remove('selected'));
                        this.classList.add('selected');
                        const chosen = this.getAttribute('data-color') || '';
                        if (selectedColorInput) selectedColorInput.value = chosen;
                        if (selectedColorLabel) selectedColorLabel.textContent = chosen;
                        if (colorWarning) colorWarning.style.display = 'none';
                    };
                });
            } else {
                colorGroup.style.display = 'none';
            }
        }

        // 3. Quantity Limits & Out of Stock Handlers
        const decBtn = document.getElementById('qtyDecBtn');
        const incBtn = document.getElementById('qtyIncBtn');

        if (qtyInput) {
            if (stock <= 0) {
                qtyInput.value = '0';
                qtyInput.min = '0';
                qtyInput.max = '0';
                qtyInput.disabled = true;
                if (decBtn) decBtn.disabled = true;
                if (incBtn) incBtn.disabled = true;
            } else {
                qtyInput.disabled = false;
                qtyInput.min = '1';
                qtyInput.max = String(stock);
                qtyInput.value = '1';
                if (decBtn) decBtn.disabled = false;
                if (incBtn) incBtn.disabled = false;
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

            if (decBtn) {
                decBtn.onclick = function() {
                    if (stock <= 0) return;
                    let current = parseInt(qtyInput.value, 10) || 1;
                    if (current > 1) {
                        qtyInput.value = current - 1;
                        validateQuantity();
                    }
                };
            }

            if (incBtn) {
                incBtn.onclick = function() {
                    if (stock <= 0) return;
                    let current = parseInt(qtyInput.value, 10) || 1;
                    if (current < stock) {
                        qtyInput.value = current + 1;
                        validateQuantity();
                    } else if (stockWarning) {
                        stockWarning.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Maximum available quantity is ${stock}.`;
                        stockWarning.style.display = 'flex';
                        setTimeout(() => {
                            if (stockWarning) stockWarning.style.display = 'none';
                        }, 3500);
                    }
                };
            }
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
                    showToast('Sorry, this item is currently out of stock.', 'warning');
                    return;
                }

                // Color Selection Requirement Validation
                if (colors.length > 0) {
                    const chosen = selectedColorInput ? selectedColorInput.value.trim() : '';
                    if (!chosen) {
                        if (colorWarning) {
                            colorWarning.style.display = 'block';
                            colorWarning.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Please select a color before adding to cart.';
                        }
                        showToast('Please select an available color option first!', 'warning');
                        return;
                    }
                }

                const qty = qtyInput ? (Math.min(stock, Math.max(1, parseInt(qtyInput.value, 10) || 1))) : 1;
                const selectedColor = (colors.length > 0 && selectedColorInput) ? selectedColorInput.value.trim() : null;

                if (typeof addToCart === 'function') {
                    await addToCart(product.id || product._id, qty, selectedColor);
                } else if (window.API && API.addToCart) {
                    try {
                        await API.addToCart(product.id || product._id, qty, selectedColor || '');
                        const colorNotice = selectedColor ? ` (Color: ${selectedColor})` : '';
                        showToast(`Added ${qty} x "${product.name}"${colorNotice} to your cart!`, 'success');
                        window.dispatchEvent(new Event('pico_cart_updated'));
                        if (window.updateCartNavBadges) window.updateCartNavBadges();
                    } catch (err) {
                        showToast(`Could not add to cart: ${err.message}`, 'error');
                    }
                }
            };
        }

        // 3.5 Wishlist Button Handler
        const detailsWishlistBtn = document.getElementById('detailsWishlistBtn');
        if (detailsWishlistBtn) {
            const prodId = String(product.id || product._id);
            const isWished = (typeof isInWishlist === 'function') ? isInWishlist(prodId) : false;
            updateDetailsWishlistBtn(detailsWishlistBtn, isWished);

            detailsWishlistBtn.onclick = function(e) {
                e.preventDefault();
                if (typeof toggleWishlist === 'function') {
                    toggleWishlist({
                        id: prodId,
                        name: product.name,
                        price: product.price,
                        image: product.image
                    }, detailsWishlistBtn);
                    const nowWished = (typeof isInWishlist === 'function') ? isInWishlist(prodId) : false;
                    updateDetailsWishlistBtn(detailsWishlistBtn, nowWished);
                }
            };
        }

        function updateDetailsWishlistBtn(btn, active) {
            if (!btn) return;
            const icon = btn.querySelector('i');
            const span = btn.querySelector('span');
            if (active) {
                btn.classList.add('in-wishlist');
                if (icon) icon.className = 'fa-solid fa-heart';
                if (span) span.textContent = 'Saved in Wishlist';
            } else {
                btn.classList.remove('in-wishlist');
                if (icon) icon.className = 'fa-regular fa-heart';
                if (span) span.textContent = 'Add to Wishlist';
            }
        }
    }

    // 4. Initialize Customer Reviews & Ratings
    initProductReviews(product);

    await renderRelatedProducts(product.id || product._id);
});

/**
 * Customer Reviews & Ratings Controller
 */
function initProductReviews(product) {
    const avgNumEl = document.getElementById('reviewsAvgRating');
    const starsSummaryEl = document.getElementById('reviewsStarsSummary');
    const totalCountEl = document.getElementById('reviewsTotalCount');
    const authPrompt = document.getElementById('reviewAuthPrompt');
    const reviewForm = document.getElementById('productReviewForm');
    const reviewsList = document.getElementById('reviewsListContainer');
    const starSelector = document.getElementById('starRatingSelector');
    const starText = document.getElementById('starRatingText');
    const starInput = document.getElementById('selectedStarRating');
    const commentInput = document.getElementById('reviewCommentInput');
    const submitBtn = document.getElementById('submitReviewBtn');

    if (!reviewsList) return;

    let reviews = Array.isArray(product.reviews) ? [...product.reviews] : [];

    function updateRatingSummary(ratingVal, reviewsCount) {
        const numRating = Number(ratingVal || 5);
        if (avgNumEl) avgNumEl.textContent = numRating.toFixed(1);
        if (totalCountEl) totalCountEl.textContent = `Based on ${reviewsCount} customer review${reviewsCount === 1 ? '' : 's'}`;
        if (starsSummaryEl) {
            starsSummaryEl.innerHTML = renderRatingStars(numRating);
        }
    }

    function renderReviewsList() {
        if (!reviewsList) return;
        if (reviews.length === 0) {
            reviewsList.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 35px 20px; background: #fff; border-radius: 12px; border: 1px dashed #e2e8f0; margin-top: 15px;">
                    <i class="fa-regular fa-comment-dots" style="font-size: 36px; color: #cbd5e1; margin-bottom: 10px;"></i>
                    <p style="font-size: 15px; color: #64748b; font-weight: 600;">No customer reviews yet.</p>
                    <small style="color: #94a3b8;">Be the first verified collector to share your review for this model!</small>
                </div>
            `;
            return;
        }

        reviewsList.innerHTML = reviews.map(rev => {
            const dateStr = rev.createdAt ? new Date(rev.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) : 'Recently';

            return `
                <div class="review-item-card">
                    <div class="review-item-header">
                        <div class="reviewer-meta">
                            <div class="reviewer-avatar">
                                <i class="fa-solid fa-circle-user"></i>
                            </div>
                            <div>
                                <h4 class="reviewer-name">${escapeHTML(rev.userName || 'Verified Collector')}</h4>
                                <span class="review-date">${dateStr}</span>
                            </div>
                        </div>
                        <div class="rating review-item-stars">
                            ${renderRatingStars(rev.rating)}
                        </div>
                    </div>
                    <div class="review-item-comment">
                        <p>${escapeHTML(rev.comment)}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Initial render of summary and list
    updateRatingSummary(product.rating, reviews.length);
    renderReviewsList();

    // Check login state
    const token = window.API ? API.getToken() : localStorage.getItem('pico_token');
    const localUser = localStorage.getItem('pico_current_user');

    if (token || localUser) {
        if (reviewForm) reviewForm.style.display = 'block';
        if (authPrompt) authPrompt.style.display = 'none';
    } else {
        if (reviewForm) reviewForm.style.display = 'none';
        if (authPrompt) authPrompt.style.display = 'block';
    }

    // Star selector interaction
    if (starSelector) {
        const starBtns = starSelector.querySelectorAll('.star-btn');
        starBtns.forEach(btn => {
            btn.onclick = function() {
                const rating = parseInt(this.getAttribute('data-rating'), 10) || 5;
                if (starInput) starInput.value = rating;
                if (starText) starText.textContent = `${rating} out of 5 stars`;
                starBtns.forEach(b => {
                    const bRating = parseInt(b.getAttribute('data-rating'), 10) || 0;
                    if (bRating <= rating) {
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
                    }
                });
            };
        });
    }

    // Review form submission
    if (reviewForm) {
        reviewForm.onsubmit = async function(e) {
            e.preventDefault();
            const rating = parseInt(starInput?.value, 10) || 5;
            const comment = commentInput?.value.trim() || '';

            if (!comment) {
                showToast('Please enter your review feedback.', 'warning');
                return;
            }

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Review...';
                }

                const res = await API.addProductReview(product.id || product._id, {
                    rating,
                    comment
                });

                showToast(res.message || 'Thank you! Your review has been submitted.', 'success');
                if (commentInput) commentInput.value = '';

                if (Array.isArray(res.reviews)) {
                    reviews = res.reviews;
                }
                updateRatingSummary(res.rating, reviews.length);
                renderReviewsList();
            } catch (err) {
                showToast(`Could not submit review: ${err.message}`, 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Submit Review &#10140;';
                }
            }
        };
    }
}

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
            const ct = res.headers.get('content-type') || '';
            allProducts = ct.includes('application/json') ? await res.json() : [];
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
                    <p>৳${Number(p.price).toFixed(2)}</p>
                </div>
            `).join('');
        }
    } catch (e) {
        console.warn('Could not load related products:', e.message);
    }
}
