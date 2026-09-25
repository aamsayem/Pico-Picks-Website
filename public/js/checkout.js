/**
 * Pico Picks Dedicated Checkout & PDF Invoice Controller
 * Handles Selective Cart Synchronization, Coupon Application, Tax Removal, Order Creation, and PDF Invoice Generation
 */

const CART_STORAGE_KEY = 'pico_cart';

const checkoutState = {
    currentUser: null,
    cartItems: [],
    subtotal: 0,
    discountAmount: 0,
    couponCode: '',
    tax: 0,
    deliveryArea: 'Inside Chattogram',
    shippingFee: 70.00,
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
 * Load items for Checkout:
 * Prioritizes selected items from Selective Cart (sessionStorage), with API / LocalStorage fallback
 */
async function loadCheckoutCart() {
    let items = [];
    let subtotal = 0;

    // Check if selective cart checkout items were passed from cart.html
    try {
        const rawSelected = sessionStorage.getItem('pico_checkout_items');
        if (rawSelected) {
            const parsed = JSON.parse(rawSelected);
            if (Array.isArray(parsed) && parsed.length > 0) {
                items = parsed;
            }
        }
    } catch (e) {
        console.warn('Could not parse sessionStorage selective checkout items:', e);
    }

    // If no selective items stored, check Live API Cart first
    if (items.length === 0 && window.API && API.getToken()) {
        try {
            const apiCart = await API.getCart();
            if (apiCart && apiCart.items && apiCart.items.length > 0) {
                items = apiCart.items;
            }
        } catch (err) {
            console.warn('Could not fetch API cart:', err.message);
        }
    }

    // Guest fallback if still empty
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
                        items.push({
                            productId: product.id,
                            name: product.name,
                            price: product.price,
                            image: product.image,
                            quantity: localItem.quantity,
                            color: localItem.color || '',
                            itemSubtotal: lineSubtotal
                        });
                    }
                });
            }
        } catch (err) {
            console.warn('Guest cart parsing error:', err.message);
        }
    }

    // Calculate subtotal from verified items
    subtotal = items.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);

    checkoutState.cartItems = items;
    checkoutState.subtotal = subtotal;

    // Check for pre-applied coupon from cart.html
    try {
        const savedCoupon = sessionStorage.getItem('pico_checkout_coupon');
        if (savedCoupon) {
            const parsedCoupon = JSON.parse(savedCoupon);
            if (parsedCoupon && parsedCoupon.code && subtotal > 0) {
                checkoutState.couponCode = parsedCoupon.code;
                if (parsedCoupon.discountType === 'percentage') {
                    checkoutState.discountAmount = Math.round((subtotal * parsedCoupon.discountValue) / 100);
                } else {
                    checkoutState.discountAmount = Math.min(parsedCoupon.discountValue, subtotal);
                }
                const couponInput = document.getElementById('checkoutCouponInput');
                if (couponInput) couponInput.value = parsedCoupon.code;
            }
        }
    } catch (e) {
        console.warn('Coupon restore error:', e);
    }

    // Tax is 0 per Phase 3 specifications
    checkoutState.tax = 0.00;
    // Delivery Area Shipping: Inside Chattogram = ৳70.00, Outside Chattogram = ৳130.00
    checkoutState.deliveryArea = checkoutState.deliveryArea || 'Inside Chattogram';
    checkoutState.shippingFee = subtotal > 0 ? (checkoutState.deliveryArea === 'Outside Chattogram' ? 130.00 : 70.00) : 0.00;
    const effectiveSubtotal = Math.max(0, subtotal - checkoutState.discountAmount);
    checkoutState.total = Math.max(0, effectiveSubtotal + checkoutState.shippingFee);

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
 * 2. Render Order Summary & Calculations (Tax Removed + Coupon Discount)
 */
function renderOrderSummary() {
    const listContainer = document.getElementById('checkoutItemsList');
    const subtotalEl = document.getElementById('summarySubtotal');
    const discountRow = document.getElementById('summaryDiscountRow');
    const discountEl = document.getElementById('summaryDiscount');
    const couponCodeEl = document.getElementById('summaryCouponCode');
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
                    <span class="unit-price">৳${Number(item.price).toFixed(2)} each</span>
                </div>
            </div>
            <div class="summary-line-total">
                ৳${Number(item.price * item.quantity).toFixed(2)}
            </div>
        </div>
    `).join('');

    if (subtotalEl) subtotalEl.textContent = `৳${Number(checkoutState.subtotal).toFixed(2)}`;

    if (discountRow) {
        if (checkoutState.discountAmount > 0 && checkoutState.couponCode) {
            discountRow.style.display = 'flex';
            if (couponCodeEl) couponCodeEl.textContent = checkoutState.couponCode;
            if (discountEl) discountEl.textContent = `-৳${Number(checkoutState.discountAmount).toFixed(2)}`;
        } else {
            discountRow.style.display = 'none';
        }
    }

    const deliveryAreaEl = document.getElementById('summaryDeliveryArea');
    if (deliveryAreaEl) deliveryAreaEl.textContent = checkoutState.deliveryArea || 'Inside Chattogram';

    if (shippingEl) {
        shippingEl.textContent = `৳${Number(checkoutState.shippingFee).toFixed(2)}`;
        shippingEl.style.color = '#C8743A';
        shippingEl.style.fontWeight = '600';
    }

    if (grandTotalEl) grandTotalEl.textContent = `৳${Number(checkoutState.total).toFixed(2)}`;
    if (btnTotalText) btnTotalText.textContent = `৳${Number(checkoutState.total).toFixed(2)}`;

    if (shippingHint) {
        shippingHint.innerHTML = '<small><i class="fa-solid fa-truck-ramp-box"></i> Direct door-to-door delivery with packaging guarantee</small>';
    }
}

/**
 * 2.5 Apply Coupon directly on Checkout Page
 */
async function applyCheckoutCoupon() {
    const input = document.getElementById('checkoutCouponInput');
    const msgEl = document.getElementById('checkoutCouponMsg');
    const btn = document.getElementById('checkoutApplyCouponBtn');
    const code = input ? input.value.trim().toUpperCase() : '';

    if (!code) {
        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.className = 'coupon-feedback-msg error';
            msgEl.textContent = 'Please enter a coupon code.';
        }
        return;
    }

    if (checkoutState.subtotal <= 0) {
        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.className = 'coupon-feedback-msg error';
            msgEl.textContent = 'Cart subtotal is zero.';
        }
        return;
    }

    try {
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Validating...';
        }

        const res = await API.validateCoupon(code, checkoutState.subtotal);

        if (res && res.valid) {
            checkoutState.couponCode = res.code;
            checkoutState.discountAmount = res.discountAmount;

            // Recalculate shipping & total
            const effectiveSubtotal = Math.max(0, checkoutState.subtotal - checkoutState.discountAmount);
            checkoutState.shippingFee = effectiveSubtotal > 2000 ? 0.00 : 50.00;
            checkoutState.total = Math.max(0, effectiveSubtotal + checkoutState.shippingFee);

            sessionStorage.setItem('pico_checkout_coupon', JSON.stringify({
                code: res.code,
                discountType: res.discountType,
                discountValue: res.discountValue,
                discountAmount: res.discountAmount
            }));

            if (msgEl) {
                msgEl.style.display = 'block';
                msgEl.className = 'coupon-feedback-msg success';
                msgEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${res.message || `Coupon "${res.code}" applied!`}`;
            }

            renderOrderSummary();
        } else {
            throw new Error(res?.error || 'Invalid coupon code');
        }
    } catch (err) {
        checkoutState.couponCode = '';
        checkoutState.discountAmount = 0;
        sessionStorage.removeItem('pico_checkout_coupon');

        const effectiveSubtotal = checkoutState.subtotal;
        checkoutState.shippingFee = checkoutState.deliveryArea === 'Outside Chattogram' ? 130.00 : 70.00;
        checkoutState.total = Math.max(0, effectiveSubtotal + checkoutState.shippingFee);

        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.className = 'coupon-feedback-msg error';
            msgEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${err.message || 'Invalid coupon code'}`;
        }

        renderOrderSummary();
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Apply';
        }
    }
}

/**
 * 2.8 Delivery Area Switcher (Inside Chattogram: ৳70, Outside Chattogram: ৳130)
 */
function selectDeliveryArea(area, fee, labelElement) {
    checkoutState.deliveryArea = area;
    checkoutState.shippingFee = Number(fee) || (area === 'Outside Chattogram' ? 130.00 : 70.00);
    const effectiveSubtotal = Math.max(0, checkoutState.subtotal - checkoutState.discountAmount);
    checkoutState.total = Math.max(0, effectiveSubtotal + (checkoutState.subtotal > 0 ? checkoutState.shippingFee : 0));

    const cards = document.querySelectorAll('.delivery-option-card');
    cards.forEach(card => card.classList.remove('active'));

    if (labelElement) {
        labelElement.classList.add('active');
        const radio = labelElement.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    }

    renderOrderSummary();
}
window.selectDeliveryArea = selectDeliveryArea;

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
        deliveryArea: checkoutState.deliveryArea || 'Inside Chattogram',
        couponCode: checkoutState.couponCode || '',
        discountAmount: checkoutState.discountAmount || 0,
        items: checkoutState.cartItems.map(item => ({
            productId: item.productId || item.id,
            quantity: item.quantity,
            color: item.color || ''
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

        // Clean up session storage selective items and coupon
        sessionStorage.removeItem('pico_checkout_items');
        sessionStorage.removeItem('pico_checkout_coupon');

        // Clean up guest local cart: remove only purchased items
        try {
            const rawLocal = localStorage.getItem(CART_STORAGE_KEY);
            if (rawLocal) {
                let localCart = JSON.parse(rawLocal);
                const purchasedIds = new Set(checkoutState.cartItems.map(i => String(i.productId || i.id)));
                localCart = localCart.filter(item => !purchasedIds.has(String(item.productId || item.id)));
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(localCart));
            }
        } catch (e) {
            console.warn('Guest cart cleanup notice:', e);
        }

        // Transition from Form to Order Success Receipt
        showOrderSuccess(createdOrder, { fullName, email, phone, address, city, postalCode });

    } catch (err) {
        console.error('Checkout error:', err);
        alert(`Could not complete order: ${err.message}`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Place Order (৳${Number(checkoutState.total).toFixed(2)}) &#10140;`;
        }
    }
}

/**
 * 5. Display Order Success & Populate Printable Invoice (No Tax + Shows Discount)
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
    const areaEl = document.getElementById('successDeliveryArea');
    const payEl = document.getElementById('successPaymentMethod');
    const totalEl = document.getElementById('successTotalAmount');

    if (nameEl) nameEl.textContent = customer.fullName || 'Collector';
    if (idEl) idEl.textContent = `#${shortId}`;
    if (dateEl) dateEl.textContent = formattedDate;
    if (areaEl) areaEl.textContent = order.deliveryArea || checkoutState.deliveryArea || 'Inside Chattogram';
    if (payEl) payEl.textContent = order.paymentMethod || 'Cash on Delivery';
    if (totalEl) totalEl.textContent = `৳${Number(order.totalAmount || 0).toFixed(2)}`;

    // Populate Official Printable Invoice
    const invNumber = document.getElementById('invNumber');
    const invDate = document.getElementById('invDate');
    const invStatus = document.getElementById('invStatus');
    const invCustName = document.getElementById('invCustName');
    const invCustAddress = document.getElementById('invCustAddress');
    const invCustCity = document.getElementById('invCustCity');
    const invCustPostal = document.getElementById('invCustPostal');
    const invCustPhone = document.getElementById('invCustPhone');
    const invCustEmail = document.getElementById('invCustEmail');
    const invDeliveryArea = document.getElementById('invDeliveryArea');
    const invPaymentMethod = document.getElementById('invPaymentMethod');
    const invItemsBody = document.getElementById('invItemsTableBody');
    const invSubtotal = document.getElementById('invSubtotal');
    const invDiscountRow = document.getElementById('invDiscountRow');
    const invCouponCode = document.getElementById('invCouponCode');
    const invDiscount = document.getElementById('invDiscount');
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
    if (invDeliveryArea) invDeliveryArea.textContent = order.deliveryArea || checkoutState.deliveryArea || 'Inside Chattogram';
    if (invPaymentMethod) invPaymentMethod.textContent = order.paymentMethod || 'Cash on Delivery';

    if (invItemsBody) {
        const items = order.orderItems || [];
        invItemsBody.innerHTML = items.map((item, index) => `
            <tr>
                <td style="text-align: center; color: #64748b;">${index + 1}</td>
                <td>
                    <strong>${escapeHTML(item.name)}</strong>
                    ${item.color ? `<div style="font-size: 11px; color: #c8743a; font-weight: 600;">Color: ${escapeHTML(item.color)}</div>` : ''}
                    <div style="font-size: 11px; color: #64748b;">SKU / ID: ${escapeHTML(item.productId)}</div>
                </td>
                <td style="text-align: right;">৳${Number(item.price).toFixed(2)}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right; font-weight: 600;">৳${Number(item.price * item.quantity).toFixed(2)}</td>
            </tr>
        `).join('');
    }

    if (invSubtotal) invSubtotal.textContent = `৳${Number(order.subtotal || 0).toFixed(2)}`;

    // Invoice Discount row (tax removed!)
    if (invDiscountRow) {
        const disc = Number(order.discountAmount || 0);
        if (disc > 0) {
            invDiscountRow.style.display = 'flex';
            if (invCouponCode) invCouponCode.textContent = order.couponCode || 'PROMO';
            if (invDiscount) invDiscount.textContent = `-৳${disc.toFixed(2)}`;
        } else {
            invDiscountRow.style.display = 'none';
        }
    }

    if (invShipping) invShipping.textContent = `৳${Number(order.shippingFee !== undefined ? order.shippingFee : checkoutState.shippingFee).toFixed(2)}`;
    if (invGrandTotal) invGrandTotal.textContent = `৳${Number(order.totalAmount || 0).toFixed(2)}`;

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
window.applyCheckoutCoupon = applyCheckoutCoupon;
