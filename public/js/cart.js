/**
 * Pico Picks Cart System (Full-Stack API + LocalStorage Sync)
 */

const CART_STORAGE_KEY = 'pico_cart';

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

async function addToCart(productId, quantity = 1) {
    const qty = parseInt(quantity, 10) || 1;

    // Check if user is logged in via token
    if (window.API && API.getToken()) {
        try {
            await API.addToCart(productId, qty);
            showAddToCartNotification(productId, qty);
            if (window.location.pathname.includes('cart.html')) {
                await renderCartPage();
            }
            return;
        } catch (e) {
            console.warn('API cart error, using local fallback:', e.message);
        }
    }

    // Guest LocalStorage fallback
    const cart = getLocalCart();
    const existingIndex = cart.findIndex(item => item.id === productId);

    if (existingIndex > -1) {
        cart[existingIndex].quantity += qty;
    } else {
        cart.push({ id: productId, quantity: qty });
    }

    saveLocalCart(cart);
    showAddToCartNotification(productId, qty);

    if (window.location.pathname.includes('cart.html')) {
        await renderCartPage();
    }
}

async function removeFromCart(productId) {
    if (window.API && API.getToken()) {
        try {
            await API.removeFromCart(productId);
            if (window.location.pathname.includes('cart.html')) {
                await renderCartPage();
            }
            return;
        } catch (e) {
            console.warn('API error removing item, fallback:', e.message);
        }
    }

    let cart = getLocalCart();
    cart = cart.filter(item => item.id !== productId);
    saveLocalCart(cart);

    if (window.location.pathname.includes('cart.html')) {
        await renderCartPage();
    }
}

async function updateCartQuantity(productId, quantity) {
    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    if (window.API && API.getToken()) {
        try {
            await API.updateCart(productId, qty);
            if (window.location.pathname.includes('cart.html')) {
                await renderCartPage();
            }
            return;
        } catch (e) {
            console.warn('API error updating item, fallback:', e.message);
        }
    }

    const cart = getLocalCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity = qty;
        saveLocalCart(cart);
    }

    if (window.location.pathname.includes('cart.html')) {
        await renderCartPage();
    }
}

function showAddToCartNotification(productId, quantity) {
    let productName = 'Item';
    if (typeof PRODUCTS !== 'undefined') {
        const product = PRODUCTS.find(p => p.id === productId);
        if (product) productName = product.name;
    }
    alert(`${quantity} x "${productName}" has been added to your cart!`);
}

async function renderCartPage() {
    const cartTable = document.querySelector('.cart-page table');
    const totalPriceTable = document.querySelector('.total-price table');
    if (!cartTable || !totalPriceTable) return;

    let items = [];
    let subtotal = 0;
    let tax = 0;
    let total = 0;

    // Try fetching cart from backend API if logged in
    if (window.API && API.getToken()) {
        try {
            const apiCartData = await API.getCart();
            items = apiCartData.items || [];
            subtotal = apiCartData.subtotal || 0;
            tax = apiCartData.tax || 0;
            total = apiCartData.total || 0;
        } catch (e) {
            console.warn('Failed to load user cart from API:', e.message);
        }
    }

    // LocalStorage fallback if API not used or offline
    if (items.length === 0 && !API.getToken()) {
        const localCart = getLocalCart();
        localCart.forEach(item => {
            const product = (typeof PRODUCTS !== 'undefined') ? PRODUCTS.find(p => p.id === item.id) : null;
            if (product) {
                const itemSubtotal = product.price * item.quantity;
                subtotal += itemSubtotal;
                items.push({
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    quantity: item.quantity,
                    itemSubtotal: itemSubtotal
                });
            }
        });
        tax = subtotal > 0 ? 30.00 : 0.00;
        total = subtotal + tax;
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
                            <img src="${item.image}" alt="${escapeHTML(item.name)}">
                            <div>
                                <p>${escapeHTML(item.name)}</p>
                                <small>Price: $${Number(item.price).toFixed(2)}</small>
                                <br>
                                <a href="#" onclick="removeFromCart('${item.productId}'); return false;">Remove</a>
                            </div>
                        </div>
                    </td>
                    <td>
                        <input type="number" value="${item.quantity}" min="1" onchange="updateCartQuantity('${item.productId}', this.value)">
                    </td>
                    <td>$${Number(item.itemSubtotal).toFixed(2)}</td>
                </tr>
            `;
        });
    }

    cartTable.innerHTML = tableHTML;

    // Render Totals
    totalPriceTable.innerHTML = `
        <tr>
            <td>Subtotal</td>
            <td>$${Number(subtotal).toFixed(2)}</td>
        </tr>
        <tr>
            <td>Tax</td>
            <td>$${Number(tax).toFixed(2)}</td>
        </tr>
        <tr>
            <td>Total</td>
            <td>$${Number(total).toFixed(2)}</td>
        </tr>
    `;
}

document.addEventListener('DOMContentLoaded', async function() {
    if (window.location.pathname.includes('cart.html')) {
        await renderCartPage();
    }
});
