/**
 * Pico Picks Cart & Checkout System (Live API Driven + Selective Cart + Coupon Engine)
 */

const CART_STORAGE_KEY = 'pico_cart';

// In-memory cart runtime state
let currentCartItems = [];
let selectedCartItemIds = new Set();
let appliedCoupon = null;

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

function getLocalCart() {
    try {
        const stored = localStorage.getItem(CART_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

function saveLocalCart(cart) {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
        console.error('Failed to save local cart:', e);
    }
}

/**
 * Sync guest localStorage cart to database once user logs in
 */
async function syncGuestCartToAPI() {
    if (!window.API || !API.getToken()) return;
    const localItems = getLocalCart();
    if (localItems.length === 0) return;

    try {
        for (const item of localItems) {
            await API.addToCart(item.productId || item.id, item.quantity, item.color || '');
        }
        localStorage.removeItem(CART_STORAGE_KEY);
    } catch (e) {
        console.warn('Cart sync notice:', e.message);
    }
}

/**
 * Add item to Cart via live API (or LocalStorage fallback for guests)
 */
async function addToCart(productId, quantity = 1, color = null) {
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const colorInfo = color ? ` (Color: ${color})` : '';

    if (window.API && API.getToken()) {
        try {
            await API.addToCart(productId, qty, color || '');
            alert(`Item added to your cart!${colorInfo}`);
            if (window.location.pathname.includes('cart.html')) {
                await renderCartPage();
            }
            return;
        } catch (e) {
            console.warn('API cart error:', e.message);
            alert(`Could not add to cart: ${e.message}`);
            return;
        }
    }

    // Guest fallback
    const cart = getLocalCart();
    const existing = cart.find(item => (item.productId === productId || item.id === productId) && (!color || item.color === color));
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({ productId, quantity: qty, ...(color ? { color } : {}) });
    }
    saveLocalCart(cart);
    alert(`Item added to your cart${colorInfo} (Guest mode). Please log in to complete checkout!`);

    if (window.location.pathname.includes('cart.html')) {
        await renderCartPage();
    }
}

/**
 * Remove item from Cart via live API
 */
async function removeFromCart(productId) {
    selectedCartItemIds.delete(productId);

    if (window.API && API.getToken()) {
        try {
            await API.removeFromCart(productId);
            if (window.location.pathname.includes('cart.html')) {
                await renderCartPage();
            }
            return;
        } catch (e) {
            console.error('API error removing item:', e.message);
        }
    }

    let cart = getLocalCart();
    cart = cart.filter(item => (item.productId !== productId && item.id !== productId));
    saveLocalCart(cart);

    if (window.location.pathname.includes('cart.html')) {
        await renderCartPage();
    }
}

/**
 * Update item quantity via live API
 */
async function updateCartQuantity(productId, quantity) {
    const qty = parseInt(quantity, 10);

    if (window.API && API.getToken()) {
        try {
            if (qty <= 0) {
                await API.removeFromCart(productId);
                selectedCartItemIds.delete(productId);
            } else {
                await API.updateCart(productId, qty);
            }
            if (window.location.pathname.includes('cart.html')) {
                await renderCartPage();
            }
            return;
        } catch (e) {
            console.error('API error updating quantity:', e.message);
        }
    }

    let cart = getLocalCart();
    if (qty <= 0) {
        cart = cart.filter(item => (item.productId !== productId && item.id !== productId));
        selectedCartItemIds.delete(productId);
    } else {
        const item = cart.find(i => (i.productId === productId || i.id === productId));
        if (item) item.quantity = qty;
    }
    saveLocalCart(cart);

    if (window.location.pathname.includes('cart.html')) {
        await renderCartPage();
    }
}

/**
 * Toggle Select All Cart items
 */
function toggleSelectAllCart(checked) {
    if (checked) {
        currentCartItems.forEach(item => selectedCartItemIds.add(item.productId));
    } else {
        selectedCartItemIds.clear();
    }

    const itemCheckboxes = document.querySelectorAll('.cart-item-checkbox');
    itemCheckboxes.forEach(cb => cb.checked = checked);

    calculateAndRenderTotals();
}

/**
 * Toggle single Cart item checkbox
 */
function toggleCartItemSelection(productId, checked) {
    if (checked) {
        selectedCartItemIds.add(productId);
    } else {
        selectedCartItemIds.delete(productId);
    }

    const selectAllCheckbox = document.getElementById('selectAllCart');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = currentCartItems.length > 0 && selectedCartItemIds.size === currentCartItems.length;
    }

    calculateAndRenderTotals();
}

/**
 * Calculate totals strictly based on SELECTED items + Applied Coupon (Tax Eliminated!)
 */
function calculateAndRenderTotals() {
    let selectedSubtotal = 0;

    currentCartItems.forEach(item => {
        if (selectedCartItemIds.has(item.productId)) {
            selectedSubtotal += Number(item.price) * Number(item.quantity);
        }
    });

    // Recompute coupon discount against current selected subtotal
    let discountAmount = 0;
    if (appliedCoupon && selectedSubtotal > 0) {
        if (selectedSubtotal >= (appliedCoupon.minOrderAmount || 0)) {
            if (appliedCoupon.discountType === 'percentage') {
                discountAmount = Math.round((selectedSubtotal * appliedCoupon.discountValue) / 100);
            } else {
                discountAmount = Math.min(appliedCoupon.discountValue, selectedSubtotal);
            }
        } else {
            // Under minimum order amount
            const msgEl = document.getElementById('cartCouponMsg');
            if (msgEl) {
                msgEl.style.display = 'block';
                msgEl.className = 'coupon-feedback-msg error';
                msgEl.textContent = `Coupon "${appliedCoupon.code}" requires minimum order of ৳${appliedCoupon.minOrderAmount}.`;
            }
        }
    }

    // Shipping calculation: Free over ৳2000, ৳50 flat, or ৳0 if 0 items selected
    const shippingFee = selectedSubtotal > 0 ? ((selectedSubtotal - discountAmount) > 2000 ? 0.00 : 50.00) : 0.00;
    const grandTotal = Math.max(0, selectedSubtotal - discountAmount + shippingFee);

    // Update UI Elements
    const subtotalEl = document.getElementById('cartSubtotalText');
    const discountRow = document.getElementById('cartDiscountRow');
    const couponNameEl = document.getElementById('cartCouponName');
    const discountTextEl = document.getElementById('cartDiscountText');
    const shippingEl = document.getElementById('cartShippingText');
    const grandTotalEl = document.getElementById('cartGrandTotalText');

    if (subtotalEl) subtotalEl.textContent = `৳${selectedSubtotal.toFixed(2)}`;

    if (discountRow) {
        if (discountAmount > 0 && appliedCoupon) {
            discountRow.style.display = 'table-row';
            if (couponNameEl) couponNameEl.textContent = appliedCoupon.code;
            if (discountTextEl) discountTextEl.textContent = `-৳${discountAmount.toFixed(2)}`;
        } else {
            discountRow.style.display = 'none';
        }
    }

    if (shippingEl) {
        shippingEl.textContent = shippingFee === 0 ? (selectedSubtotal > 0 ? 'FREE' : '৳0.00') : `৳${shippingFee.toFixed(2)}`;
        shippingEl.style.color = shippingFee === 0 && selectedSubtotal > 0 ? '#16a34a' : 'inherit';
        shippingEl.style.fontWeight = shippingFee === 0 && selectedSubtotal > 0 ? '700' : 'normal';
    }

    if (grandTotalEl) grandTotalEl.textContent = `৳${grandTotal.toFixed(2)}`;

    // Update checkout button text with count of selected items
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        const count = selectedCartItemIds.size;
        checkoutBtn.innerHTML = `Proceed to Checkout (${count} item${count === 1 ? '' : 's'}) &#10140;`;
    }
}

/**
 * Apply Coupon Code in Cart
 */
async function applyCartCoupon() {
    const input = document.getElementById('cartCouponInput');
    const msgEl = document.getElementById('cartCouponMsg');
    const btn = document.getElementById('cartApplyCouponBtn');
    const code = input ? input.value.trim().toUpperCase() : '';

    if (!code) {
        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.className = 'coupon-feedback-msg error';
            msgEl.textContent = 'Please enter a coupon code.';
        }
        return;
    }

    // Compute current selected subtotal
    let selectedSubtotal = 0;
    currentCartItems.forEach(item => {
        if (selectedCartItemIds.has(item.productId)) {
            selectedSubtotal += Number(item.price) * Number(item.quantity);
        }
    });

    if (selectedSubtotal <= 0) {
        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.className = 'coupon-feedback-msg error';
            msgEl.textContent = 'Please select at least one item before applying a coupon.';
        }
        return;
    }

    try {
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Checking...';
        }

        const res = await API.validateCoupon(code, selectedSubtotal);

        if (res && res.valid) {
            appliedCoupon = {
                code: res.code,
                discountType: res.discountType,
                discountValue: res.discountValue,
                discountAmount: res.discountAmount,
                minOrderAmount: res.minOrderAmount || 0
            };

            // Store in sessionStorage for checkout handover
            sessionStorage.setItem('pico_checkout_coupon', JSON.stringify(appliedCoupon));

            if (msgEl) {
                msgEl.style.display = 'block';
                msgEl.className = 'coupon-feedback-msg success';
                msgEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${res.message || `Coupon "${res.code}" applied!`}`;
            }

            calculateAndRenderTotals();
        } else {
            throw new Error(res?.error || 'Invalid coupon code');
        }
    } catch (err) {
        appliedCoupon = null;
        sessionStorage.removeItem('pico_checkout_coupon');
        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.className = 'coupon-feedback-msg error';
            msgEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${err.message || 'Invalid coupon code'}`;
        }
        calculateAndRenderTotals();
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Apply';
        }
    }
}

/**
 * Render Cart Page contents dynamically
 */
async function renderCartPage() {
    const tableBody = document.getElementById('cartTableBody');
    if (!tableBody) return;

    await syncGuestCartToAPI();

    let items = [];

    // Load from Live Express API if authenticated
    if (window.API && API.getToken()) {
        try {
            const apiCart = await API.getCart();
            items = apiCart.items || [];
        } catch (e) {
            console.warn('API cart load failure:', e.message);
        }
    }

    // Guest fallback: resolve items from catalog
    if (items.length === 0 && (!window.API || !API.getToken())) {
        const localCart = getLocalCart();
        if (localCart.length > 0) {
            try {
                const catalog = await API.getProducts();
                localCart.forEach(item => {
                    const id = item.productId || item.id;
                    const prod = catalog.find(p => p.id === id || p._id === id);
                    if (prod) {
                        const lineSubtotal = prod.price * item.quantity;
                        items.push({
                            productId: prod.id,
                            name: prod.name,
                            price: prod.price,
                            image: prod.image,
                            quantity: item.quantity,
                            color: item.color || null,
                            itemSubtotal: lineSubtotal
                        });
                    }
                });
            } catch (e) {
                console.warn('Catalog lookup error for guest cart:', e.message);
            }
        }
    }

    currentCartItems = items;

    // By default, select all items if no selections made yet
    if (selectedCartItemIds.size === 0) {
        items.forEach(i => selectedCartItemIds.add(i.productId));
    } else {
        // Retain only IDs that still exist in the cart
        const existingIds = new Set(items.map(i => i.productId));
        selectedCartItemIds = new Set([...selectedCartItemIds].filter(id => existingIds.has(id)));
    }

    // Render Table Rows
    let tableHTML = '';

    if (items.length === 0) {
        tableHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 45px 15px;">
                    <div style="font-size: 32px; color: #cbd5e1; margin-bottom: 10px;"><i class="fa-solid fa-basket-shopping"></i></div>
                    <h3 style="font-size: 20px; color: #1e293b;">Your cart is empty</h3>
                    <p style="color: #64748b; margin-top: 6px;">Add some die-cast models to begin building your collection.</p>
                    <p style="margin-top: 15px;"><a href="products.html" class="btn" style="display: inline-block; padding: 8px 24px;">Explore Products</a></p>
                </td>
            </tr>
        `;
        const selectAllCheckbox = document.getElementById('selectAllCart');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
    } else {
        items.forEach(item => {
            const isSelected = selectedCartItemIds.has(item.productId);
            const lineSubtotal = Number(item.price) * Number(item.quantity);

            tableHTML += `
                <tr>
                    <td style="text-align: center; vertical-align: middle;">
                        <input type="checkbox" class="cart-item-checkbox" data-id="${item.productId}" 
                            ${isSelected ? 'checked' : ''} 
                            onchange="toggleCartItemSelection('${item.productId}', this.checked)"
                            aria-label="Select ${escapeHTML(item.name)}">
                    </td>
                    <td>
                        <div class="cart-info">
                            <img src="${item.image}" alt="${escapeHTML(item.name)}" onerror="this.src='images/logo.png'">
                            <div>
                                <p style="font-weight: 600;">${escapeHTML(item.name)}</p>
                                <small style="color: #64748b;">Price: ৳${Number(item.price).toFixed(2)}</small>
                                ${item.color ? `<br><small style="color: #c8743a; font-weight: 600;">Color: ${escapeHTML(item.color)}</small>` : ''}
                                <br>
                                <a href="#" onclick="removeFromCart('${item.productId}'); return false;" style="color: #ef4444; font-size: 13px;">Remove</a>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="qty-control qty-control-sm">
                            <button type="button" class="qty-btn qty-dec" onclick="stepCartQuantity('${item.productId}', -1)" aria-label="Decrease quantity">−</button>
                            <input type="number" id="cart-qty-${item.productId}" value="${item.quantity}" min="1" onchange="updateCartQuantity('${item.productId}', this.value)">
                            <button type="button" class="qty-btn qty-inc" onclick="stepCartQuantity('${item.productId}', 1)" aria-label="Increase quantity">+</button>
                        </div>
                    </td>
                    <td style="font-weight: 600; color: #1e293b;">৳${lineSubtotal.toFixed(2)}</td>
                </tr>
            `;
        });

        const selectAllCheckbox = document.getElementById('selectAllCart');
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = selectedCartItemIds.size === items.length;
        }
    }

    tableBody.innerHTML = tableHTML;

    // Restore any existing saved coupon from sessionStorage
    try {
        const savedCoupon = sessionStorage.getItem('pico_checkout_coupon');
        if (savedCoupon && !appliedCoupon) {
            appliedCoupon = JSON.parse(savedCoupon);
            const input = document.getElementById('cartCouponInput');
            if (input && appliedCoupon.code) input.value = appliedCoupon.code;
        }
    } catch (e) {}

    calculateAndRenderTotals();
}

/**
 * Step quantity via +/- buttons in cart table
 */
async function stepCartQuantity(productId, delta) {
    const input = document.getElementById(`cart-qty-${productId}`);
    let val = input ? parseInt(input.value, 10) : 1;
    if (isNaN(val)) val = 1;
    const nextVal = Math.max(1, val + delta);
    if (input) input.value = nextVal;
    await updateCartQuantity(productId, nextVal);
}

/**
 * Proceed to Checkout Logic
 * Passes ONLY the selected cart items and any applied coupon to checkout.html
 */
function proceedToCheckout(e) {
    if (e && e.preventDefault) e.preventDefault();

    if (currentCartItems.length === 0) {
        alert('Your shopping cart is empty.');
        return;
    }

    const selectedItems = currentCartItems.filter(item => selectedCartItemIds.has(item.productId));

    if (selectedItems.length === 0) {
        alert('Please select at least one item using the checkboxes to proceed to checkout.');
        return;
    }

    // Save only checked items to sessionStorage for checkout.html
    sessionStorage.setItem('pico_checkout_items', JSON.stringify(selectedItems));

    if (appliedCoupon) {
        sessionStorage.setItem('pico_checkout_coupon', JSON.stringify(appliedCoupon));
    } else {
        sessionStorage.removeItem('pico_checkout_coupon');
    }

    window.location.href = 'checkout.html';
}

document.addEventListener('DOMContentLoaded', async function() {
    if (window.location.pathname.includes('cart.html')) {
        await renderCartPage();
    }
});

// Global attachments
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.stepCartQuantity = stepCartQuantity;
window.toggleSelectAllCart = toggleSelectAllCart;
window.toggleCartItemSelection = toggleCartItemSelection;
window.applyCartCoupon = applyCartCoupon;
window.proceedToCheckout = proceedToCheckout;
