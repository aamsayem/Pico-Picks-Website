/**
 * Pico Picks Customer Dashboard Controller
 * Handles Order History, Profile Updates, and Customer Support Chat
 */

let customerProfileState = {
    user: null,
    orders: [],
    selectedOrder: null,
    activeTab: 'orders',
    chatInterval: null
};

// Security helper: Escape HTML tags
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * 1. Initialize Profile & Guard
 */
async function initProfile() {
    if (!window.API || !API.getToken()) {
        window.location.href = 'account.html';
        return;
    }

    try {
        const user = await API.getProfile();
        if (!user) {
            window.location.href = 'account.html';
            return;
        }

        customerProfileState.user = user;
        renderUserProfileHeader(user);
        populateProfileForm(user);

        // Load customer orders
        await loadCustomerOrders();

        // Check URL hash if user navigated to a specific tab
        const hash = window.location.hash.replace('#', '');
        if (['orders', 'settings', 'chat'].includes(hash)) {
            switchProfileTab(hash);
        }
    } catch (err) {
        console.error('Failed to authenticate profile:', err);
        API.setToken(null);
        localStorage.removeItem('pico_current_user');
        window.location.href = 'account.html';
    }
}

/**
 * Render User Profile Banner
 */
function renderUserProfileHeader(user) {
    const avatarEl = document.getElementById('userAvatar');
    const nameEl = document.getElementById('profileDisplayName');
    const emailEl = document.getElementById('profileDisplayEmail');
    const roleEl = document.getElementById('profileDisplayRole');
    const adminBtn = document.getElementById('adminShortcutBtn');

    const displayName = user.name || user.username || 'Valued Collector';
    const initial = (displayName.charAt(0) || 'U').toUpperCase();

    if (avatarEl) avatarEl.textContent = initial;
    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.innerHTML = `<i class="fa-regular fa-envelope"></i> ${escapeHTML(user.email || 'N/A')}`;
    
    if (roleEl) {
        if (user.role === 'admin') {
            roleEl.innerHTML = `<span style="background: #fef3c7; color: #b45309; font-weight: 700; padding: 2px 8px; border-radius: 10px; font-size: 11px;">ADMINISTRATOR</span>`;
            if (adminBtn) adminBtn.style.display = 'inline-flex';
        } else {
            roleEl.textContent = 'Account Status: Verified Collector';
        }
    }
}

/**
 * Populate Profile & Shipping Settings Form
 */
function populateProfileForm(user) {
    const nameInput = document.getElementById('custName');
    const phoneInput = document.getElementById('custPhone');
    const emailInput = document.getElementById('custEmail');
    const usernameInput = document.getElementById('custUsername');
    const addressInput = document.getElementById('custAddress');
    const cityInput = document.getElementById('custCity');
    const postalInput = document.getElementById('custPostal');

    if (nameInput) nameInput.value = user.name || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    if (emailInput) emailInput.value = user.email || '';
    if (usernameInput) usernameInput.value = user.username || '';
    if (addressInput) addressInput.value = user.address || '';
    if (cityInput) cityInput.value = user.city || '';
    if (postalInput) postalInput.value = user.postalCode || '';
}

/**
 * 2. Tab Navigation
 */
function switchProfileTab(tabName) {
    customerProfileState.activeTab = tabName;

    // Reset buttons
    const btnOrders = document.getElementById('tabBtnOrders');
    const btnSettings = document.getElementById('tabBtnSettings');
    const btnChat = document.getElementById('tabBtnChat');

    if (btnOrders) btnOrders.classList.remove('active');
    if (btnSettings) btnSettings.classList.remove('active');
    if (btnChat) btnChat.classList.remove('active');

    // Reset panes
    const paneOrders = document.getElementById('ordersPane');
    const paneSettings = document.getElementById('settingsPane');
    const paneChat = document.getElementById('chatPane');

    if (paneOrders) paneOrders.classList.remove('active');
    if (paneSettings) paneSettings.classList.remove('active');
    if (paneChat) paneChat.classList.remove('active');

    // Clear chat polling interval if switching away from chat
    if (customerProfileState.chatInterval) {
        clearInterval(customerProfileState.chatInterval);
        customerProfileState.chatInterval = null;
    }

    if (tabName === 'orders') {
        if (btnOrders) btnOrders.classList.add('active');
        if (paneOrders) paneOrders.classList.add('active');
    } else if (tabName === 'settings') {
        if (btnSettings) btnSettings.classList.add('active');
        if (paneSettings) paneSettings.classList.add('active');
    } else if (tabName === 'chat') {
        if (btnChat) btnChat.classList.add('active');
        if (paneChat) paneChat.classList.add('active');
        loadCustomerChatMessages();
        // Start polling every 4 seconds for live support responses
        customerProfileState.chatInterval = setInterval(loadCustomerChatMessages, 4000);
    }

    window.location.hash = tabName;
}

/**
 * 3. Order History & Details Management
 */
async function loadCustomerOrders() {
    const container = document.getElementById('ordersContainer');
    const badge = document.getElementById('ordersCountBadge');

    try {
        const orders = await API.getMyOrders();
        customerProfileState.orders = Array.isArray(orders) ? orders : [];

        if (badge) badge.textContent = customerProfileState.orders.length;

        if (!container) return;

        if (customerProfileState.orders.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px 20px;">
                    <div style="font-size: 48px; color: #cbd5e1; margin-bottom: 12px;"><i class="fa-solid fa-box-open"></i></div>
                    <h3 style="color: #334155; margin-bottom: 6px;">No orders found yet</h3>
                    <p style="color: #64748b; font-size: 14px; max-width: 400px; margin: 0 auto 20px;">You haven't placed any orders with Pico Picks yet. Explore our scale model showroom and start your dream garage today!</p>
                    <a href="products.html" class="btn" style="border-radius: 25px; padding: 10px 24px;">
                        <i class="fa-solid fa-car"></i> Explore Products
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="orders-grid">
                ${customerProfileState.orders.map(order => {
                    const orderId = order._id;
                    const shortId = orderId ? orderId.substring(orderId.length - 8).toUpperCase() : 'N/A';
                    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
                    const status = order.orderStatus || 'Pending';
                    const statusClass = `order-badge-${status.toLowerCase()}`;
                    const items = order.orderItems || [];
                    const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
                    const grandTotal = Number(order.totalAmount || order.totalPrice || 0).toFixed(2);

                    return `
                        <div class="customer-order-card">
                            <div class="customer-order-header">
                                <div>
                                    <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Order ID</span>
                                    <div style="font-family: monospace; font-size: 15px; font-weight: 700; color: #1e293b;">#${shortId}</div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="order-badge-pill ${statusClass}">${escapeHTML(status)}</span>
                                    <span style="font-size: 12px; color: #64748b;">${dateStr}</span>
                                </div>
                            </div>

                            <!-- Items Summary Preview -->
                            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 14px;">
                                ${items.slice(0, 3).map(item => `
                                    <div style="display: flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px;">
                                        <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" style="width: 32px; height: 32px; object-fit: contain;" onerror="this.src='images/logo.png'">
                                        <div style="font-size: 12px; color: #334155;">
                                            <span style="font-weight: 600;">${escapeHTML(item.name.substring(0, 22))}${item.name.length > 22 ? '...' : ''}</span>
                                            <span style="color: #94a3b8;">x${item.quantity}</span>
                                        </div>
                                    </div>
                                `).join('')}
                                ${items.length > 3 ? `<span style="font-size: 12px; color: #64748b;">+${items.length - 3} more item(s)</span>` : ''}
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 12px; flex-wrap: wrap; gap: 10px;">
                                <div>
                                    <span style="font-size: 12px; color: #64748b;">Total Amount:</span>
                                    <strong style="color: #C8743A; font-size: 16px; margin-left: 4px;">৳${grandTotal}</strong>
                                    <span style="font-size: 12px; color: #94a3b8; margin-left: 6px;">(${itemCount} item${itemCount !== 1 ? 's' : ''})</span>
                                </div>
                                <div style="display: flex; gap: 8px;">
                                    <button type="button" class="btn" onclick="openOrderModal('${orderId}')" style="padding: 7px 16px; font-size: 12px; border-radius: 20px; background: #C8743A; color: #fff;">
                                        <i class="fa-solid fa-file-invoice"></i> View Invoice
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (err) {
        console.error('Error fetching customer orders:', err);
        if (container) {
            container.innerHTML = `<div style="text-align: center; color: #dc2626; padding: 30px;">Failed to load orders: ${escapeHTML(err.message)}</div>`;
        }
    }
}

/**
 * Open Order Details Modal & Populate Invoice
 */
function openOrderModal(orderId) {
    const order = customerProfileState.orders.find(o => String(o._id) === String(orderId));
    if (!order) {
        alert('Order could not be found.');
        return;
    }

    customerProfileState.selectedOrder = order;

    const shortId = order._id ? order._id.substring(order._id.length - 8).toUpperCase() : 'N/A';
    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
    const status = order.orderStatus || 'Pending';
    const statusClass = `order-badge-${status.toLowerCase()}`;

    // Populate Modal Fields
    document.getElementById('modalOrderShortId').textContent = `ORDER #${shortId}`;
    document.getElementById('modalOrderDate').textContent = `Date Placed: ${dateStr}`;

    const statusBadge = document.getElementById('modalOrderStatusBadge');
    statusBadge.className = `order-badge-pill ${statusClass}`;
    statusBadge.textContent = status;

    document.getElementById('modalPaymentStatus').textContent = `${order.paymentStatus || 'Pending'} (${order.paymentMethod || 'Cash on Delivery'})`;

    // Shipping address
    const ship = order.shippingAddress || {};
    document.getElementById('modalShippingAddress').innerHTML = `
        <strong>${escapeHTML(ship.fullName || customerProfileState.user.name || 'Valued Customer')}</strong><br>
        <i class="fa-solid fa-phone" style="font-size: 11px; color: #94a3b8;"></i> ${escapeHTML(ship.phone || 'N/A')}<br>
        <i class="fa-solid fa-location-dot" style="font-size: 11px; color: #94a3b8;"></i> ${escapeHTML(ship.address || 'Address not recorded')}, ${escapeHTML(ship.city || '')} ${escapeHTML(ship.postalCode || '')}
    `;

    // Items table
    const tableBody = document.getElementById('modalItemsTableBody');
    tableBody.innerHTML = (order.orderItems || []).map(item => {
        const lineTotal = Number(item.price * item.quantity).toFixed(2);
        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px; display: flex; align-items: center; gap: 10px;">
                    <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" style="width: 38px; height: 38px; object-fit: contain;" onerror="this.src='images/logo.png'">
                    <strong>${escapeHTML(item.name)}</strong>
                </td>
                <td style="padding: 10px; color: #64748b;">${escapeHTML(item.color || 'Standard')}</td>
                <td style="padding: 10px; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; text-align: right;">৳${Number(item.price).toFixed(2)}</td>
                <td style="padding: 10px; text-align: right; font-weight: 600;">৳${lineTotal}</td>
            </tr>
        `;
    }).join('');

    // Pricing calculation
    const subtotal = Number(order.subtotal || 0);
    const discount = Number(order.discountAmount || 0);
    const shipping = Number(order.shippingPrice || (order.deliveryArea && order.deliveryArea.includes('Outside') ? 130 : 70));
    const grandTotal = Number(order.totalAmount || order.totalPrice || (subtotal - discount + shipping)).toFixed(2);

    document.getElementById('modalSubtotalText').textContent = `৳${subtotal.toFixed(2)}`;

    const discountRow = document.getElementById('modalDiscountRow');
    if (discount > 0) {
        discountRow.style.display = 'flex';
        document.getElementById('modalCouponCode').textContent = order.couponCode || 'PROMO';
        document.getElementById('modalDiscountText').textContent = `-৳${discount.toFixed(2)}`;
    } else {
        discountRow.style.display = 'none';
    }

    document.getElementById('modalShippingText').textContent = `৳${shipping.toFixed(2)}`;
    document.getElementById('modalGrandTotalText').textContent = `৳${grandTotal}`;

    const modal = document.getElementById('orderDetailModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeOrderModal() {
    const modal = document.getElementById('orderDetailModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

/**
 * Generate and download PDF Invoice from Order Modal
 */
function downloadModalInvoicePDF() {
    const invoiceEl = document.getElementById('printableInvoiceNode');
    const order = customerProfileState.selectedOrder;

    if (!invoiceEl) {
        alert('Invoice node is not available.');
        return;
    }

    const orderId = order && order._id ? order._id.substring(order._id.length - 8).toUpperCase() : 'RECEIPT';

    if (typeof html2pdf === 'undefined') {
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

    const downloadBtn = document.getElementById('modalDownloadPdfBtn');
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
            console.error('PDF Invoice generation failed:', err);
            alert('PDF download encountered an issue. Falling back to print.');
            window.print();
            if (downloadBtn) {
                downloadBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Download Invoice (PDF)';
                downloadBtn.disabled = false;
            }
        });
}

/**
 * 4. Profile & Shipping Address Update via PUT /api/auth/profile
 */
async function handleProfileSubmit(event) {
    event.preventDefault();

    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    const city = document.getElementById('custCity').value.trim();
    const postalCode = document.getElementById('custPostal').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    const statusEl = document.getElementById('profileSaveStatus');
    const submitBtn = document.getElementById('saveProfileBtn');

    if (newPassword) {
        if (newPassword.length < 4) {
            alert('New password must be at least 4 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match. Please verify your new password.');
            return;
        }
    }

    const payload = {
        name,
        phone,
        address,
        city,
        postalCode
    };

    if (newPassword) {
        payload.password = newPassword;
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        }
        if (statusEl) {
            statusEl.textContent = 'Saving changes...';
            statusEl.style.color = '#C8743A';
        }

        const res = await API.updateProfile(payload);

        if (statusEl) {
            statusEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Profile updated successfully!';
            statusEl.style.color = '#16a34a';
        }

        // Update local user state and header
        if (res && res.user) {
            customerProfileState.user = {
                ...customerProfileState.user,
                ...res.user
            };
            renderUserProfileHeader(customerProfileState.user);
        }

        // Clear password fields
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        alert('Your profile and shipping details have been saved successfully!');
    } catch (err) {
        console.error('Profile update failed:', err);
        if (statusEl) {
            statusEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${escapeHTML(err.message || 'Update failed')}`;
            statusEl.style.color = '#dc2626';
        }
        alert(err.message || 'Could not update profile. Please try again.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Profile Changes';
        }
    }
}

/**
 * 5. Customer Support Chat
 */
async function loadCustomerChatMessages() {
    const box = document.getElementById('chatMessagesBox');
    if (!box) return;

    try {
        const messages = await API.getCustomerMessages();

        if (!Array.isArray(messages) || messages.length === 0) {
            box.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #94a3b8;">
                    <i class="fa-solid fa-comments" style="font-size: 32px; color: #cbd5e1; margin-bottom: 8px;"></i>
                    <p style="font-size: 14px; color: #475569; font-weight: 600;">Welcome to Pico Picks Customer Support</p>
                    <p style="font-size: 13px; max-width: 420px; margin: 4px auto 0;">Have a question about an order, scale details, or shipping inquiry? Send us a message below and our team will reply promptly.</p>
                </div>
            `;
            return;
        }

        box.innerHTML = messages.map(msg => {
            const isCustomer = msg.senderRole === 'customer';
            const wrapClass = isCustomer ? 'customer' : 'admin';
            const senderName = isCustomer ? 'You' : 'Pico Picks Support (Admin)';
            const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            return `
                <div class="chat-bubble-wrap ${wrapClass}">
                    <span class="chat-bubble-sender-name">
                        ${!isCustomer ? '<i class="fa-solid fa-shield-halved" style="color: #C8743A; margin-right: 3px;"></i>' : ''}
                        ${escapeHTML(senderName)}
                    </span>
                    <div class="chat-bubble ${wrapClass}">
                        ${escapeHTML(msg.text)}
                    </div>
                    <span class="chat-bubble-time">${timeStr}</span>
                </div>
            `;
        }).join('');

        // Auto-scroll to bottom
        box.scrollTop = box.scrollHeight;
    } catch (err) {
        console.warn('Failed to load chat messages:', err.message);
    }
}

async function handleSendCustomerMessage(event) {
    event.preventDefault();
    const input = document.getElementById('chatInputText');
    const sendBtn = document.getElementById('chatSendBtn');
    const text = input ? input.value.trim() : '';

    if (!text) return;

    try {
        if (sendBtn) sendBtn.disabled = true;
        input.value = '';

        await API.sendCustomerMessage(text);
        await loadCustomerChatMessages();
    } catch (err) {
        alert(`Failed to send message: ${err.message}`);
    } finally {
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.focus();
    }
}

/**
 * 6. Customer Logout
 */
function logoutCustomer() {
    if (confirm('Are you sure you want to log out from your account?')) {
        if (window.API) API.setToken(null);
        localStorage.removeItem('pico_current_user');
        window.location.href = 'account.html';
    }
}

// Global exposure
window.switchProfileTab = switchProfileTab;
window.openOrderModal = openOrderModal;
window.closeOrderModal = closeOrderModal;
window.downloadModalInvoicePDF = downloadModalInvoicePDF;
window.handleProfileSubmit = handleProfileSubmit;
window.handleSendCustomerMessage = handleSendCustomerMessage;
window.loadCustomerOrders = loadCustomerOrders;
window.loadCustomerChatMessages = loadCustomerChatMessages;
window.logoutCustomer = logoutCustomer;

// Initialization on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initProfile();

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('orderDetailModal');
        if (e.target === modal) {
            closeOrderModal();
        }
    });
});
