/**
 * Pico Picks Cart & Checkout System (Live API Driven)
 */

const CART_STORAGE_KEY = 'pico_cart';

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
 * Render Cart Page contents dynamically
 */
async function renderCartPage() {
    const cartTable = document.querySelector('.cart-page table');
    const totalPriceTable = document.querySelector('.total-price table');
    if (!cartTable || !totalPriceTable) return;

    await syncGuestCartToAPI();

    let items = [];
    let subtotal = 0;
    let tax = 0;
    let shippingFee = 0;
    let total = 0;

    // Load from Live Express API if authenticated
    if (window.API && API.getToken()) {
        try {
            const apiCart = await API.getCart();
            items = apiCart.items || [];
            subtotal = apiCart.subtotal || 0;
            tax = apiCart.tax || 0;
            shippingFee = apiCart.shippingFee || 0;
            total = apiCart.total || 0;
        } catch (e) {
            console.warn('API cart load failure:', e.message);
        }
    }

    // Guest fallback: resolve prices from API catalog
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
                        subtotal += lineSubtotal;
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
                tax = subtotal > 0 ? 30.00 : 0.00;
                shippingFee = subtotal > 2000 ? 0.00 : (subtotal > 0 ? 50.00 : 0.00);
                total = subtotal + tax + shippingFee;
            } catch (e) {
                console.warn('Catalog lookup error for guest cart:', e.message);
            }
        }
    }

    // Render Table Rows
    let tableHTML = `
        <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Subtotal</th>
        </tr>
    `;

    if (items.length === 0) {
        tableHTML += `
            <tr>
                <td colspan="3" style="text-align: center; padding: 40px 10px;">
                    <h3>Your cart is empty</h3>
                    <p style="margin-top: 10px;"><a href="products.html" class="btn" style="display: inline-block; padding: 8px 20px;">Explore Products</a></p>
                </td>
            </tr>
        `;
    } else {
        items.forEach(item => {
            tableHTML += `
                <tr>
                    <td>
                        <div class="cart-info">
                            <img src="${item.image}" alt="${escapeHTML(item.name)}" onerror="this.src='images/logo.png'">
                            <div>
                                <p>${escapeHTML(item.name)}</p>
                                <small>Price: ৳${Number(item.price).toFixed(2)}</small>
                                ${item.color ? `<br><small style="color: #c8743a; font-weight: 600;">Color: ${escapeHTML(item.color)}</small>` : ''}
                                <br>
                                <a href="#" onclick="removeFromCart('${item.productId}'); return false;">Remove</a>
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
                    <td>৳${Number(item.itemSubtotal).toFixed(2)}</td>
                </tr>
            `;
        });
    }

    cartTable.innerHTML = tableHTML;

    // Render Totals Table
    totalPriceTable.innerHTML = `
        <tr>
            <td>Subtotal</td>
            <td>৳${Number(subtotal).toFixed(2)}</td>
        </tr>
        <tr>
            <td>Tax</td>
            <td>৳${Number(tax).toFixed(2)}</td>
        </tr>
        <tr>
            <td>Shipping</td>
            <td>৳${Number(shippingFee).toFixed(2)}</td>
        </tr>
        <tr>
            <td>Total</td>
            <td>৳${Number(total).toFixed(2)}</td>
        </tr>
    `;

    // Render / Update Proceed to Checkout Button
    const actionsContainer = document.querySelector('.cart-checkout-actions');
    const totalPriceContainer = document.querySelector('.total-price');
    const targetParent = actionsContainer || totalPriceContainer;
    if (targetParent) {
        let checkoutBtn = document.getElementById('checkoutBtn');
        if (items.length > 0) {
            if (!checkoutBtn) {
                checkoutBtn = document.createElement('a');
                checkoutBtn.id = 'checkoutBtn';
                checkoutBtn.className = 'btn checkout-btn';
                checkoutBtn.textContent = 'Proceed to Checkout ➜';
                checkoutBtn.onclick = proceedToCheckout;
                targetParent.appendChild(checkoutBtn);
            } else {
                checkoutBtn.style.display = 'inline-flex';
                checkoutBtn.onclick = proceedToCheckout;
            }
        } else if (checkoutBtn) {
            checkoutBtn.style.display = 'none';
        }
    }
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
 * 4. Proceed to Checkout Logic
 * Redirects user directly to the dedicated checkout page
 */
function proceedToCheckout(e) {
    if (e && e.preventDefault) e.preventDefault();
    window.location.href = 'checkout.html';
}

document.addEventListener('DOMContentLoaded', async function() {
    if (window.location.pathname.includes('cart.html')) {
        await renderCartPage();
    }
});
