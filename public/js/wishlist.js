/**
 * Pico Picks Wishlist Management System
 * Supports saving favorite die-cast collectibles, navbar badge tracking, and Move-to-Cart actions
 */

const WISHLIST_STORAGE_KEY = 'pico_wishlist';

function getWishlist() {
    try {
        const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Failed to read wishlist:', e);
        return [];
    }
}

function saveWishlist(items) {
    try {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
        updateWishlistNavBadges();
    } catch (e) {
        console.error('Failed to save wishlist:', e);
    }
}

function isInWishlist(productId) {
    const list = getWishlist();
    return list.some(item => String(item.id) === String(productId) || String(item.productId) === String(productId));
}

function toggleWishlist(product, btnEl) {
    if (!product || !product.id) return;
    const list = getWishlist();
    const prodId = String(product.id);
    const existingIndex = list.findIndex(item => String(item.id) === prodId || String(item.productId) === prodId);

    if (existingIndex > -1) {
        list.splice(existingIndex, 1);
        saveWishlist(list);
        showWishlistToast(`"${product.name || 'Item'}" removed from your wishlist.`);
        updateHeartButtonState(btnEl, false);
    } else {
        list.push({
            id: prodId,
            productId: prodId,
            name: product.name,
            price: Number(product.price) || 0,
            image: product.image || 'images/logo.png'
        });
        saveWishlist(list);
        showWishlistToast(`"${product.name || 'Item'}" added to your wishlist! ❤️`);
        updateHeartButtonState(btnEl, true);
    }

    if (window.location.pathname.includes('wishlist.html')) {
        renderWishlistPage();
    }
}

function removeFromWishlist(productId) {
    let list = getWishlist();
    list = list.filter(item => String(item.id) !== String(productId) && String(item.productId) !== String(productId));
    saveWishlist(list);
    showWishlistToast('Item removed from wishlist.');

    if (window.location.pathname.includes('wishlist.html')) {
        renderWishlistPage();
    }
}

async function moveToCart(productId) {
    const list = getWishlist();
    const item = list.find(i => String(i.id) === String(productId) || String(i.productId) === String(productId));
    if (!item) return;

    if (typeof addToCart === 'function') {
        await addToCart(item.id || item.productId, 1);
    } else if (window.API && API.getToken()) {
        try {
            await API.addToCart(item.id || item.productId, 1);
            showWishlistToast('Moved item to cart!');
        } catch (e) {
            console.error('Error moving to cart:', e);
        }
    } else {
        // Guest mode fallback
        try {
            const rawCart = localStorage.getItem('pico_cart');
            const cart = rawCart ? JSON.parse(rawCart) : [];
            const existing = cart.find(c => String(c.productId || c.id) === String(item.id));
            if (existing) {
                existing.quantity += 1;
            } else {
                cart.push({ productId: item.id, quantity: 1 });
            }
            localStorage.setItem('pico_cart', JSON.stringify(cart));
            showWishlistToast('Moved item to cart! (Guest)');
        } catch (e) {
            console.error('Guest cart error:', e);
        }
    }

    removeFromWishlist(productId);
}

function updateHeartButtonState(btnEl, active) {
    if (!btnEl) return;
    const icon = btnEl.querySelector('i');
    if (active) {
        btnEl.classList.add('in-wishlist');
        btnEl.setAttribute('aria-label', 'Remove from Wishlist');
        btnEl.setAttribute('title', 'Remove from Wishlist');
        if (icon) {
            icon.className = 'fa-solid fa-heart';
        }
    } else {
        btnEl.classList.remove('in-wishlist');
        btnEl.setAttribute('aria-label', 'Add to Wishlist');
        btnEl.setAttribute('title', 'Add to Wishlist');
        if (icon) {
            icon.className = 'fa-regular fa-heart';
        }
    }
}

function updateWishlistNavBadges() {
    const count = getWishlist().length;
    const badges = document.querySelectorAll('.nav-wishlist-count, #navWishlistCount');
    badges.forEach(badge => {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
    });
}

function showWishlistToast(message) {
    let toast = document.getElementById('picoWishlistToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'picoWishlistToast';
        toast.className = 'pico-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove('show');
    }, 2800);
}

function renderWishlistPage() {
    const container = document.getElementById('wishlistItemsContainer');
    const emptyState = document.getElementById('wishlistEmptyState');
    const countHeader = document.getElementById('wishlistCountText');
    if (!container) return;

    const items = getWishlist();

    if (countHeader) {
        countHeader.textContent = `${items.length} Item${items.length === 1 ? '' : 's'}`;
    }

    if (items.length === 0) {
        container.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    container.style.display = 'grid';

    container.innerHTML = items.map(item => `
        <div class="wishlist-card">
            <button type="button" class="wishlist-remove-btn" onclick="removeFromWishlist('${item.id}')" title="Remove from Wishlist" aria-label="Remove item">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <a href="product-details.html?id=${encodeURIComponent(item.id)}" class="wishlist-card-img-link">
                <img src="${item.image}" alt="${item.name}" onerror="this.src='images/logo.png'">
            </a>
            <div class="wishlist-card-body">
                <a href="product-details.html?id=${encodeURIComponent(item.id)}" class="wishlist-card-title">
                    <h4>${item.name}</h4>
                </a>
                <div class="wishlist-card-price">৳${Number(item.price).toFixed(2)}</div>
                <div class="wishlist-card-actions">
                    <button type="button" class="btn wishlist-move-btn" onclick="moveToCart('${item.id}')">
                        <i class="fa-solid fa-cart-plus"></i> Move to Cart
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    updateWishlistNavBadges();
    if (window.location.pathname.includes('wishlist.html')) {
        renderWishlistPage();
    }
});

// Global attachments
window.getWishlist = getWishlist;
window.isInWishlist = isInWishlist;
window.toggleWishlist = toggleWishlist;
window.removeFromWishlist = removeFromWishlist;
window.moveToCart = moveToCart;
window.updateWishlistNavBadges = updateWishlistNavBadges;
