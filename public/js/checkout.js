/**
 * Pico Picks Dedicated Checkout & PDF Invoice Controller
 * Handles Cart Synchronization, Form Validation, Order Creation, and PDF Invoice Generation
 */

const CART_STORAGE_KEY = 'pico_cart';

const checkoutState = {
    currentUser: null,
    cartItems: [],
    subtotal: 0,
    tax: 0,
    shippingFee: 0,
    total: 0,
    selectedPayment: 'Cash on Delivery',
    currentOrder: null
};

// Security helper: prevent XSS in dynamic templates
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

/**
 * 1. Initialize Checkout Data
 */
document.addEventListener('DOMContentLoaded', async () => {
    await checkUserSession();
    await loadCheckoutCart();
});

/**
 * Check if user is logged in & prefill contact details
 */
async function checkUserSession() {
    if (window.API && API.getToken()) {
        try {
            const user = await API.getProfile();
            if (user) {
                checkoutState.currentUser = user;
                const nameInput = document.getElementById('custFullName');
                const emailInput = document.getElementById('custEmail');

                if (nameInput && user.username) nameInput.value = user.username;
                if (emailInput && user.email) emailInput.value = user.email;
            }
        } catch (e) {
            console.warn('Session check notice:', e.message);
        }
    }
}

/**
 * Load items from Live API cart (or guest LocalStorage fallback)
 */
async function loadCheckoutCart() {
    let items = [];
    let subtotal = 0;
    let tax = 0;
    let shippingFee = 0;
    let total = 0;

    // Check Live API Cart first if token exists
    if (window.API && API.getToken()) {
        try {
            const apiCart = await API.getCart();
            if (apiCart && apiCart.items && apiCart.items.length > 0) {
                items = apiCart.items;
                subtotal = apiCart.subtotal || 0;
                tax = apiCart.tax || 0;
                shippingFee = apiCart.shippingFee || 0;
                total = apiCart.total || 0;
            }
        } catch (err) {
            console.warn('Could not fetch API cart:', err.message);
        }
    }

    // Guest fallback if no API items found
    if (items.length === 0) {
        try {
            const rawLocal = localStorage.getItem(CART_STORAGE_KEY);
            const localCart = rawLocal ? JSON.parse(rawLocal) : [];

            if (localCart.length > 0) {
                const catalog = await API.getProducts();
                localCart.forEach(localItem => {
                    const id = localItem.productId || localItem.id;
                    const product = catalog.find(p => p.id === id || p._id === id);
                    if (product) {
                        const lineSubtotal = product.price * localItem.quantity;
                        subtotal += lineSubtotal;
                        items.push({
                            productId: product.id,
                            name: product.name,
                            price: product.price,
                            image: product.image,
                            quantity: localItem.quantity,
                            itemSubtotal: lineSubtotal
                        });
                    }
                });

                tax = subtotal > 0 ? 30.00 : 0.00;
                shippingFee = subtotal > 2000 ? 0.00 : (subtotal > 0 ? 50.00 : 0.00);
                total = subtotal + tax + shippingFee;
            }
        } catch (err) {
            console.warn('Guest cart parsing error:', err.message);
        }
    }

    checkoutState.cartItems = items;
    checkoutState.subtotal = subtotal;
    checkoutState.tax = tax;
    checkoutState.shippingFee = shippingFee;
    checkoutState.total = total;

    // Handle Empty State
    const emptyState = document.getElementById('checkoutEmptyState');
    const activeSection = document.getElementById('checkoutActiveSection');

    if (items.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (activeSection) activeSection.style.display = 'none';
        return;
    } else {
        if (emptyState) emptyState.style.display = 'none';
        if (activeSection) activeSection.style.display = 'block';
    }

    renderOrderSummary();
}

/**
 * 2. Render Order Summary & Calculations
 */
function renderOrderSummary() {
    const listContainer = document.getElementById('checkoutItemsList');
    const subtotalEl = document.getElementById('summarySubtotal');
    const taxEl = document.getElementById('summaryTax');
    const shippingEl = document.getElementById('summaryShipping');
    const grandTotalEl = document.getElementById('summaryGrandTotal');
    const btnTotalText = document.getElementById('btnTotalText');
    const shippingHint = document.getElementById('shippingHint');

    if (!listContainer) return;

    listContainer.innerHTML = checkoutState.cartItems.map(item => `
        <div class="summary-item">
            <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" class="summary-thumb" onerror="this.src='images/logo.png'">
            <div class="summary-details">
                <h4>${escapeHTML(item.name)}</h4>
                <div class="summary-meta">
                    <span class="qty-badge">Qty: ${item.quantity}</span>
                    ${item.color ? `<span class="qty-badge" style="background:#ffedd5; color:#9a3412;">Color: ${escapeHTML(item.color)}</span>` : ''}
                    <span class="unit-price">$${Number(item.price).toFixed(2)} each</span>
                </div>
            </div>
            <div class="summary-line-total">
                $${Number(item.price * item.quantity).toFixed(2)}
            </div>
        </div>
    `).join('');

    if (subtotalEl) subtotalEl.textContent = `$${Number(checkoutState.subtotal).toFixed(2)}`;
    if (taxEl) taxEl.textContent = `$${Number(checkoutState.tax).toFixed(2)}`;
    if (shippingEl) {
        shippingEl.textContent = checkoutState.shippingFee === 0 
            ? 'FREE' 
            : `$${Number(checkoutState.shippingFee).toFixed(2)}`;
        if (checkoutState.shippingFee === 0) {
            shippingEl.style.color = '#16a34a';
            shippingEl.style.fontWeight = '700';
        }
    }
    if (grandTotalEl) grandTotalEl.textContent = `$${Number(checkoutState.total).toFixed(2)}`;
    if (btnTotalText) btnTotalText.textContent = `$${Number(checkoutState.total).toFixed(2)}`;

    if (shippingHint) {
        if (checkoutState.subtotal >= 2000) {
            shippingHint.innerHTML = '<small style="color: #16a34a; font-weight: 600;"><i class="fa-solid fa-check"></i> You have qualified for Free Shipping!</small>';
        } else {
            const needed = 2000 - checkoutState.subtotal;
            shippingHint.innerHTML = `<small><i class="fa-solid fa-circle-info"></i> Add $${needed.toFixed(2)} more for Free Shipping</small>`;
        }
    }
}

/**
 * 3. Payment Method Switcher
 */
function selectPaymentMethod(method, labelElement) {
    checkoutState.selectedPayment = method;

    const cards = document.querySelectorAll('.payment-option-card');
    cards.forEach(card => card.classList.remove('active'));

    if (labelElement) {
        labelElement.classList.add('active');
        const radio = labelElement.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    }
}

/**
 * 4. Handle Checkout Form Submission (Create Order)
 */
async function handleCheckoutSubmit(e) {
    e.preventDefault();

    if (checkoutState.cartItems.length === 0) {
        alert('Your shopping cart is empty.');
        return;
    }

    const submitBtn = document.getElementById('submitOrderBtn');
    const fullName = document.getElementById('custFullName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const email = document.getElementById('custEmail').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    const city = document.getElementById('custCity').value.trim();
    const postalCode = document.getElementById('custPostal').value.trim();
    const notes = document.getElementById('orderNotes').value.trim();

    if (!fullName || !phone || !email || !address || !city) {
        alert('Please fill out all required fields marked with *');
        return;
    }

    const payload = {
        shippingAddress: {
            fullName,
            phone,
            address: notes ? `${address} (Note: ${notes})` : address,
            city,
            postalCode
        },
        email,
        paymentMethod: checkoutState.selectedPayment,
        items: checkoutState.cartItems.map(item => ({
            productId: item.productId || item.id,
            quantity: item.quantity
        }))
    };

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Your Order...';
        }

        const res = await API.createOrder(payload);

        if (!res || !res.order) {
            throw new Error(res?.error || 'Order creation failed.');
        }

        const createdOrder = res.order;
        checkoutState.currentOrder = createdOrder;

        // Clear local storage cart
        localStorage.removeItem(CART_STORAGE_KEY);

        // Transition from Form to Order Success Receipt
        showOrderSuccess(createdOrder, { fullName, email, phone, address, city, postalCode });

    } catch (err) {
        console.error('Checkout error:', err);
        alert(`Could not complete order: ${err.message}`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Place Order ($${Number(checkoutState.total).toFixed(2)}) &#10140;`;
        }
    }
}

/**
 * 5. Display Order Success & Populate Printable Invoice
 */
function showOrderSuccess(order, customer) {
    const activeSection = document.getElementById('checkoutActiveSection');
    const successSection = document.getElementById('checkoutSuccessSection');

    if (activeSection) activeSection.style.display = 'none';
    if (successSection) successSection.style.display = 'block';

    const shortId = order._id ? order._id.substring(order._id.length - 8).toUpperCase() : 'N/A';
    const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : new Date().toLocaleDateString();

    // Populate Success Banner Meta
    const nameEl = document.getElementById('successCustomerName');
    const idEl = document.getElementById('successOrderId');
    const dateEl = document.getElementById('successOrderDate');
    const payEl = document.getElementById('successPaymentMethod');
    const totalEl = document.getElementById('successTotalAmount');

    if (nameEl) nameEl.textContent = customer.fullName || 'Collector';
    if (idEl) idEl.textContent = `#${shortId}`;
    if (dateEl) dateEl.textContent = formattedDate;
    if (payEl) payEl.textContent = order.paymentMethod || 'Cash on Delivery';
    if (totalEl) totalEl.textContent = `$${Number(order.totalAmount || 0).toFixed(2)}`;

    // Populate Official Invoice Document
    const invNumber = document.getElementById('invNumber');
    const invDate = document.getElementById('invDate');
    const invStatus = document.getElementById('invStatus');
    const invCustName = document.getElementById('invCustName');
    const invCustAddress = document.getElementById('invCustAddress');
    const invCustCity = document.getElementById('invCustCity');
    const invCustPostal = document.getElementById('invCustPostal');
    const invCustPhone = document.getElementById('invCustPhone');
    const invCustEmail = document.getElementById('invCustEmail');
    const invPaymentMethod = document.getElementById('invPaymentMethod');
    const invItemsBody = document.getElementById('invItemsTableBody');
    const invSubtotal = document.getElementById('invSubtotal');
    const invTax = document.getElementById('invTax');
    const invShipping = document.getElementById('invShipping');
    const invGrandTotal = document.getElementById('invGrandTotal');

    if (invNumber) invNumber.textContent = `INV-${shortId}`;
    if (invDate) invDate.textContent = formattedDate;
    if (invStatus) invStatus.textContent = order.paymentMethod === 'Cash on Delivery' ? 'PENDING COD' : 'PAID';
    if (invCustName) invCustName.textContent = customer.fullName || 'N/A';
    if (invCustAddress) invCustAddress.textContent = customer.address || 'N/A';
    if (invCustCity) invCustCity.textContent = customer.city || '';
    if (invCustPostal) invCustPostal.textContent = customer.postalCode || '';
    if (invCustPhone) invCustPhone.textContent = customer.phone || 'N/A';
    if (invCustEmail) invCustEmail.textContent = customer.email || 'N/A';
    if (invPaymentMethod) invPaymentMethod.textContent = order.paymentMethod || 'Cash on Delivery';

    if (invItemsBody) {
        const items = order.orderItems || [];
        invItemsBody.innerHTML = items.map((item, index) => `
            <tr>
                <td style="text-align: center; color: #64748b;">${index + 1}</td>
                <td>
                    <strong>${escapeHTML(item.name)}</strong>
                    <div style="font-size: 11px; color: #64748b;">SKU / ID: ${escapeHTML(item.productId)}</div>
                </td>
                <td style="text-align: right;">$${Number(item.price).toFixed(2)}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right; font-weight: 600;">$${Number(item.price * item.quantity).toFixed(2)}</td>
            </tr>
        `).join('');
    }

    if (invSubtotal) invSubtotal.textContent = `$${Number(order.subtotal || 0).toFixed(2)}`;
    if (invTax) invTax.textContent = `$${Number(order.tax || 0).toFixed(2)}`;
    if (invShipping) invShipping.textContent = order.shippingFee === 0 ? 'FREE' : `$${Number(order.shippingFee || 0).toFixed(2)}`;
    if (invGrandTotal) invGrandTotal.textContent = `$${Number(order.totalAmount || 0).toFixed(2)}`;

    // Scroll smoothly to receipt header
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 6. Generate and Download PDF Invoice via html2pdf.js
 */
function downloadInvoicePDF() {
    const invoiceEl = document.getElementById('printableInvoice');
    if (!invoiceEl) {
        alert('Invoice element could not be found.');
        return;
    }

    const orderId = (checkoutState.currentOrder && checkoutState.currentOrder._id) 
        ? checkoutState.currentOrder._id.substring(checkoutState.currentOrder._id.length - 8).toUpperCase()
        : 'RECEIPT';

    // Verify if html2pdf CDN is loaded
    if (typeof html2pdf === 'undefined') {
        console.warn('html2pdf.js CDN not ready; falling back to window.print()');
        window.print();
        return;
    }

    const opt = {
        margin: [8, 8, 8, 8],
        filename: `PicoPicks_Invoice_${orderId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        }
    };

    const downloadBtn = document.querySelector('.btn-pdf');
    if (downloadBtn) {
        downloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF...';
        downloadBtn.disabled = true;
    }

    html2pdf()
        .set(opt)
        .from(invoiceEl)
        .save()
        .then(() => {
            if (downloadBtn) {
                downloadBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Download Invoice (PDF)';
                downloadBtn.disabled = false;
            }
        })
        .catch(err => {
            console.error('PDF generation error:', err);
            alert('PDF generation encountered an issue. Using system print instead.');
            window.print();
            if (downloadBtn) {
                downloadBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Download Invoice (PDF)';
                downloadBtn.disabled = false;
            }
        });
}

// Global exposure for inline onclick handlers
window.selectPaymentMethod = selectPaymentMethod;
window.handleCheckoutSubmit = handleCheckoutSubmit;
window.downloadInvoicePDF = downloadInvoicePDF;
