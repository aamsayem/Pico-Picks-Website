/**
 * Pico Picks Admin Dashboard Controller
 * Handles Admin Auth Guard, Product Management (CRUD), and Order Oversight
 */

const state = {
    currentUser: null,
    products: [],
    orders: [],
    conversations: [],
    selectedCustomerId: null,
    chatPollingInterval: null,
    currentTab: 'products'
};

// Security helper: Prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ImgBB API Key Configuration
const IMGBB_API_KEY = '5d33ed98748e3098e387cb994af22cd8';

/**
 * Upload an image file directly to the ImgBB API
 * @param {File} file
 * @returns {Promise<string>} Direct image display URL
 */
async function uploadImageToImgBB(file) {
    if (!IMGBB_API_KEY || IMGBB_API_KEY === 'YOUR_KEY_HERE') {
        throw new Error('ImgBB API key is not configured. Please define your IMGBB_API_KEY in js/admin.js before uploading.');
    }

    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`, {
        method: 'POST',
        body: formData
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`ImgBB Upload Failed (${response.status}): ${text || response.statusText}`);
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
        const errorMsg = data?.error?.message || 'ImgBB upload failed';
        throw new Error(`ImgBB Upload Failed: ${errorMsg}`);
    }

    return data.data.display_url || data.data.url;
}

/**
 * Live preview when an image file is selected in the file input
 */
function handleImageFileSelect(input) {
    const container = document.getElementById('imagePreviewContainer');
    const statusEl = document.getElementById('imageUploadStatus');
    if (!container) return;

    if (input.files && input.files[0]) {
        const file = input.files[0];
        const previewUrl = URL.createObjectURL(file);
        container.innerHTML = `<img src="${previewUrl}" alt="Selected Image Preview" style="max-height: 110px; object-fit: contain;">`;
        if (statusEl) {
            statusEl.textContent = `Ready: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        }
    }
}

/**
 * Live preview when gallery image files are selected
 */
function handleGalleryFilesSelect(input) {
    const container = document.getElementById('galleryPreviewContainer');
    const statusEl = document.getElementById('galleryUploadStatus');
    if (!container) return;

    if (!input.files || input.files.length === 0) {
        container.innerHTML = '<span style="color: #94a3b8; font-size: 12px;">Gallery thumbnails will appear here</span>';
        if (statusEl) statusEl.textContent = '';
        return;
    }

    const files = Array.from(input.files).slice(0, 4);
    if (input.files.length > 4) {
        showToast('You can select a maximum of 4 gallery images. Only the first 4 will be uploaded.', 'warning');
    }

    container.innerHTML = files.map(file => {
        const url = URL.createObjectURL(file);
        return `
            <div style="position:relative; width:65px; height:65px; border-radius:6px; overflow:hidden; border:1px solid #cbd5e1;">
                <img src="${url}" alt="${escapeHTML(file.name)}" style="width:100%; height:100%; object-fit:cover;">
            </div>
        `;
    }).join('');

    if (statusEl) {
        statusEl.textContent = `${files.length} gallery image(s) ready to upload`;
    }
}

/**
 * 1. Admin Authentication Guard
 */
async function checkAdminAuth() {
    const token = window.API ? API.getToken() : localStorage.getItem('pico_token');

    if (!token) {
        showToast('Access restricted: Please log in with an administrator account.', 'error');
        setTimeout(() => { window.location.href = 'account.html'; }, 800);
        return false;
    }

    try {
        const user = await API.getProfile();
        if (!user || user.role !== 'admin') {
            showToast('Access denied: You need administrator privileges to view this page.', 'error');
            setTimeout(() => { window.location.href = 'account.html'; }, 800);
            return false;
        }

        state.currentUser = user;
        const adminNameEl = document.getElementById('adminName');
        if (adminNameEl) {
            adminNameEl.textContent = user.username || 'Admin';
        }
        return true;
    } catch (error) {
        console.error('Admin Auth Check Failed:', error);
        showToast('Session expired or unauthorized. Please log in again.', 'error');
        if (window.API) API.setToken(null);
        setTimeout(() => { window.location.href = 'account.html'; }, 800);
        return false;
    }
}

function adminLogout() {
    if (confirm('Are you sure you want to log out from the Admin Panel?')) {
        if (window.API) API.setToken(null);
        localStorage.removeItem('pico_current_user');
        window.location.href = 'account.html';
    }
}

/**
 * 2. Tab Navigation
 */
function switchTab(tabName) {
    state.currentTab = tabName;

    // Clear background chat polling when switching tabs
    if (state.chatPollingInterval) {
        clearInterval(state.chatPollingInterval);
        state.chatPollingInterval = null;
    }

    // Update buttons
    const buttons = document.querySelectorAll('.sidebar-menu button');
    buttons.forEach(btn => btn.classList.remove('active'));

    const productsSection = document.getElementById('productsSection');
    const ordersSection = document.getElementById('ordersSection');
    const couponsSection = document.getElementById('couponsSection');
    const messagesSection = document.getElementById('messagesSection');
    const pageTitle = document.getElementById('pageTitle');

    if (tabName === 'products') {
        buttons[0]?.classList.add('active');
        productsSection?.classList.add('active');
        ordersSection?.classList.remove('active');
        couponsSection?.classList.remove('active');
        messagesSection?.classList.remove('active');
        pageTitle.textContent = 'Product Management';
        loadProducts();
    } else if (tabName === 'orders') {
        buttons[1]?.classList.add('active');
        ordersSection?.classList.add('active');
        productsSection?.classList.remove('active');
        couponsSection?.classList.remove('active');
        messagesSection?.classList.remove('active');
        pageTitle.textContent = 'Customer Orders';
        loadOrders();
    } else if (tabName === 'coupons') {
        buttons[2]?.classList.add('active');
        couponsSection?.classList.add('active');
        productsSection?.classList.remove('active');
        ordersSection?.classList.remove('active');
        messagesSection?.classList.remove('active');
        pageTitle.textContent = 'Coupon Management';
        loadCoupons();
    } else if (tabName === 'messages') {
        const msgBtn = document.getElementById('messagesTabBtn') || buttons[3];
        msgBtn?.classList.add('active');
        messagesSection?.classList.add('active');
        productsSection?.classList.remove('active');
        ordersSection?.classList.remove('active');
        couponsSection?.classList.remove('active');
        pageTitle.textContent = 'Customer Support Chat';
        loadAdminConversations();
        // Start polling every 4 seconds for new incoming messages
        state.chatPollingInterval = setInterval(() => {
            loadAdminConversations(true);
            if (state.selectedCustomerId) {
                loadActiveCustomerMessages(true);
            }
        }, 4000);
    }
}

/**
 * 3. Product Management (CRUD)
 */
async function loadProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    try {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 30px;">Loading catalog products...</td></tr>`;

        const products = await API.getProducts();
        state.products = products || [];

        updateProductStats();
        renderProductsTable(state.products);
    } catch (error) {
        console.error('Error loading products:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #dc2626; padding: 30px;">Failed to load products: ${escapeHTML(error.message)}</td></tr>`;
    }
}

function updateProductStats() {
    const totalEl = document.getElementById('statTotalProducts');
    const featEl = document.getElementById('statFeaturedProducts');

    if (totalEl) totalEl.textContent = state.products.length;
    if (featEl) featEl.textContent = state.products.filter(p => p.isFeatured).length;
}

function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 30px;">No products found in catalog.</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td>
                <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" class="product-thumb" onerror="this.src='images/logo.png'">
            </td>
            <td><code>${escapeHTML(p.id)}</code></td>
            <td>
                <strong>${escapeHTML(p.name)}</strong>
                ${p.colors && p.colors.length > 0 ? `<div style="font-size: 11px; color: #64748b; margin-top: 3px;"><i class="fa-solid fa-palette"></i> ${escapeHTML(p.colors.join(', '))}</div>` : ''}
            </td>
            <td>৳${Number(p.price).toFixed(2)}</td>
            <td>
                ${(p.stock !== undefined && p.stock !== null && Number(p.stock) > 0)
                    ? (Number(p.stock) <= 5
                        ? `<span class="badge" style="background: #fef3c7; color: #b45309;" title="Low Stock">${p.stock} left</span>`
                        : `<span class="badge" style="background: #dcfce7; color: #15803d;">${p.stock} in stock</span>`)
                    : `<span class="badge" style="background: #fee2e2; color: #b91c1c;">Out of Stock</span>`}
            </td>
            <td><i class="fa-solid fa-star" style="color: #f59e0b;"></i> ${p.rating ?? 5}</td>
            <td>
                ${p.isFeatured ? '<span class="badge" style="background:#fef3c7; color:#b45309; margin-right:4px;">Featured</span>' : ''}
                ${p.isLatest ? '<span class="badge" style="background:#e0f2fe; color:#0369a1;">Latest</span>' : ''}
            </td>
            <td>
                <button class="btn-action btn-edit" title="Edit Product" onclick="openEditProductModal('${escapeHTML(p.id)}')">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
                <button class="btn-action btn-delete" title="Delete Product" onclick="deleteProduct('${escapeHTML(p.id)}')">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function filterProductsTable() {
    const term = (document.getElementById('productSearchInput')?.value || '').toLowerCase().trim();
    if (!term) {
        renderProductsTable(state.products);
        return;
    }

    const filtered = state.products.filter(p => 
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.id && p.id.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.colors && p.colors.some(c => c.toLowerCase().includes(term)))
    );
    renderProductsTable(filtered);
}

// Product Modal Handlers
function openProductModal() {
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    document.getElementById('productForm').reset();
    document.getElementById('formProductId').value = '';
    document.getElementById('prodExistingImageUrl').value = '';
    document.getElementById('prodStock').value = 0;
    document.getElementById('prodColors').value = '';

    const fileInput = document.getElementById('prodImageFile');
    if (fileInput) fileInput.value = '';

    const statusEl = document.getElementById('imageUploadStatus');
    if (statusEl) statusEl.textContent = '';

    const galleryInput = document.getElementById('prodGalleryFiles');
    if (galleryInput) galleryInput.value = '';
    const existingGallery = document.getElementById('prodExistingGalleryUrls');
    if (existingGallery) existingGallery.value = '';
    const galleryStatus = document.getElementById('galleryUploadStatus');
    if (galleryStatus) galleryStatus.textContent = '';
    const galleryContainer = document.getElementById('galleryPreviewContainer');
    if (galleryContainer) galleryContainer.innerHTML = '<span style="color: #94a3b8; font-size: 12px;">Gallery thumbnails will appear here</span>';

    document.getElementById('imagePreviewContainer').innerHTML = '<span style="color: #94a3b8; font-size: 13px;">Image preview will appear here</span>';
    document.getElementById('productModal').classList.add('active');
}

function openEditProductModal(id) {
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('formProductId').value = product.id;
    document.getElementById('prodName').value = product.name || '';
    document.getElementById('prodPrice').value = product.price || 0;
    document.getElementById('prodRating').value = product.rating ?? 5;
    document.getElementById('prodStock').value = product.stock ?? 0;
    document.getElementById('prodColors').value = Array.isArray(product.colors) ? product.colors.join(', ') : (product.colors || '');
    document.getElementById('prodExistingImageUrl').value = product.image || '';

    const fileInput = document.getElementById('prodImageFile');
    if (fileInput) fileInput.value = '';

    const statusEl = document.getElementById('imageUploadStatus');
    if (statusEl) statusEl.textContent = '(Optional: select a new file to change image)';

    const existingGalleryUrls = (Array.isArray(product.galleryImages) && product.galleryImages.length > 0)
        ? product.galleryImages
        : (Array.isArray(product.images) && product.images.length > 1 ? product.images.slice(1, 5) : []);

    const existingGalleryInput = document.getElementById('prodExistingGalleryUrls');
    if (existingGalleryInput) existingGalleryInput.value = JSON.stringify(existingGalleryUrls);

    const galleryInput = document.getElementById('prodGalleryFiles');
    if (galleryInput) galleryInput.value = '';

    const galleryStatus = document.getElementById('galleryUploadStatus');
    if (galleryStatus) {
        galleryStatus.textContent = existingGalleryUrls.length > 0
            ? `(${existingGalleryUrls.length} existing thumbnails. Select new files to replace)`
            : '';
    }

    const galleryContainer = document.getElementById('galleryPreviewContainer');
    if (galleryContainer) {
        if (existingGalleryUrls.length > 0) {
            galleryContainer.innerHTML = existingGalleryUrls.map((url, i) => `
                <div style="position:relative; width:65px; height:65px; border-radius:6px; overflow:hidden; border:1px solid #cbd5e1;" title="Thumbnail ${i+1}">
                    <img src="${escapeHTML(url)}" alt="Thumbnail" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='images/logo.png'">
                </div>
            `).join('');
        } else {
            galleryContainer.innerHTML = '<span style="color: #94a3b8; font-size: 12px;">No existing gallery thumbnails</span>';
        }
    }

    document.getElementById('prodDescription').value = product.description || '';
    document.getElementById('prodIsFeatured').checked = Boolean(product.isFeatured);
    document.getElementById('prodIsLatest').checked = Boolean(product.isLatest);

    previewProductImage(product.image);
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

function previewProductImage(url) {
    const container = document.getElementById('imagePreviewContainer');
    if (!container) return;

    if (!url) {
        container.innerHTML = '<span style="color: #94a3b8; font-size: 13px;">Image preview will appear here</span>';
        return;
    }

    container.innerHTML = `<img src="${escapeHTML(url)}" alt="Preview" style="max-height: 110px; object-fit: contain;" onerror="this.onerror=null; this.parentElement.innerHTML='<span style=\\'color:#dc2626; font-size:12px;\\'>Image failed to load</span>'">`;
}

async function handleProductSubmit(e) {
    e.preventDefault();

    const saveBtn = document.getElementById('saveProductBtn');
    const existingId = document.getElementById('formProductId').value.trim();
    const existingImage = document.getElementById('prodExistingImageUrl').value.trim();
    const fileInput = document.getElementById('prodImageFile');
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;

    if (!file && !existingImage) {
        showToast('Please choose an image file for the product.', 'warning');
        return;
    }

    let finalImageUrl = existingImage;

    try {
        saveBtn.disabled = true;

        // If a new primary image file is chosen, upload it directly to ImgBB
        if (file) {
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading Image to ImgBB...';
            finalImageUrl = await uploadImageToImgBB(file);
        }

        // Check for gallery files
        const galleryInput = document.getElementById('prodGalleryFiles');
        const galleryFiles = galleryInput && galleryInput.files ? Array.from(galleryInput.files).slice(0, 4) : [];
        const existingGalleryJson = document.getElementById('prodExistingGalleryUrls')?.value || '';
        let finalGalleryUrls = [];

        if (existingGalleryJson) {
            try {
                finalGalleryUrls = JSON.parse(existingGalleryJson);
            } catch (e) {
                finalGalleryUrls = [];
            }
        }

        if (galleryFiles.length > 0) {
            saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading ${galleryFiles.length} Gallery Photos...`;
            finalGalleryUrls = await Promise.all(galleryFiles.map(f => uploadImageToImgBB(f)));
        }

        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Product...';

        const rawStock = document.getElementById('prodStock').value;
        const stockVal = rawStock !== '' ? parseInt(rawStock, 10) : 0;
        const rawColors = document.getElementById('prodColors').value;
        const colorsArray = rawColors ? rawColors.split(',').map(c => c.trim()).filter(Boolean) : [];

        const payload = {
            name: document.getElementById('prodName').value.trim(),
            price: parseFloat(document.getElementById('prodPrice').value),
            rating: parseFloat(document.getElementById('prodRating').value) || 5,
            stock: isNaN(stockVal) ? 0 : Math.max(0, stockVal),
            colors: colorsArray,
            image: finalImageUrl,
            galleryImages: finalGalleryUrls,
            description: document.getElementById('prodDescription').value.trim(),
            isFeatured: document.getElementById('prodIsFeatured').checked,
            isLatest: document.getElementById('prodIsLatest').checked
        };

        if (existingId) {
            // Update Product (PUT)
            await API.request(`/products/${encodeURIComponent(existingId)}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showToast('Product updated successfully!', 'success');
        } else {
            // Create Product (POST)
            await API.request('/products', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showToast('Product created successfully!', 'success');
        }

        closeProductModal();
        await loadProducts();
    } catch (err) {
        console.error('Error saving product:', err);
        showToast(`Failed to save product: ${err.message}`, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Product';
    }
}

async function deleteProduct(id) {
    if (!confirm(`Are you sure you want to delete product "${id}"? This action cannot be undone.`)) {
        return;
    }

    try {
        await API.request(`/products/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
        showToast('Product deleted successfully.', 'success');
        await loadProducts();
    } catch (err) {
        console.error('Error deleting product:', err);
        showToast(`Failed to delete product: ${err.message}`, 'error');
    }
}

/**
 * 4. Order Management
 */
async function loadOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    try {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 30px;">Loading customer orders...</td></tr>`;

        const orders = await API.request('/orders');
        state.orders = orders || [];

        updateOrderStats();
        renderOrdersTable(state.orders);
    } catch (error) {
        console.error('Error loading orders:', error);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #dc2626; padding: 30px;">Failed to load orders: ${escapeHTML(error.message)}</td></tr>`;
    }
}

function updateOrderStats() {
    const totalEl = document.getElementById('statTotalOrders');
    const pendingEl = document.getElementById('statPendingOrders');

    if (totalEl) totalEl.textContent = state.orders.length;
    if (pendingEl) pendingEl.textContent = state.orders.filter(o => o.orderStatus === 'Pending').length;
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 30px;">No orders found.</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(o => {
        const orderId = o._id;
        const shortId = orderId ? `${orderId.substring(0, 8)}...` : 'N/A';
        const customerName = (o.user && o.user.username) || (o.shippingAddress && o.shippingAddress.fullName) || 'Guest Customer';
        const customerEmail = (o.user && o.user.email) || '';
        const itemsCount = (o.orderItems && o.orderItems.length) || 0;
        const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A';

        const statusClass = `badge-${(o.orderStatus || 'pending').toLowerCase()}`;

        return `
            <tr>
                <td><code title="${orderId}">${shortId}</code></td>
                <td>
                    <strong>${escapeHTML(customerName)}</strong>
                    ${customerEmail ? `<br><small style="color:#64748b;">${escapeHTML(customerEmail)}</small>` : ''}
                </td>
                <td>${itemsCount} item${itemsCount !== 1 ? 's' : ''}</td>
                <td><strong>৳${Number(o.totalAmount || 0).toFixed(2)}</strong></td>
                <td>
                    <span class="badge" style="${o.paymentStatus === 'Paid' ? 'background:#dcfce7; color:#15803d;' : 'background:#fee2e2; color:#b91c1c;'}">
                        ${escapeHTML(o.paymentStatus || 'Pending')}
                    </span>
                </td>
                <td>
                    <select class="status-select ${statusClass}" onchange="updateOrderStatus('${orderId}', this.value)">
                        <option value="Pending" ${o.orderStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Confirmed" ${o.orderStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="Processing" ${o.orderStatus === 'Processing' ? 'selected' : ''}>Processing</option>
                        <option value="Shipped" ${o.orderStatus === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Delivered" ${o.orderStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="Cancelled" ${o.orderStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>${dateStr}</td>
                <td>
                    <button class="btn-action btn-view" title="View Full Order" onclick="viewOrderDetails('${orderId}')">
                        <i class="fa-solid fa-eye"></i> Details
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterOrdersTable() {
    const selectedStatus = document.getElementById('orderStatusFilter')?.value;
    if (!selectedStatus || selectedStatus === 'ALL') {
        renderOrdersTable(state.orders);
        return;
    }

    const filtered = state.orders.filter(o => o.orderStatus === selectedStatus);
    renderOrdersTable(filtered);
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await API.request(`/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ orderStatus: newStatus })
        });

        // Update local state and stats
        const order = state.orders.find(o => o._id === orderId);
        if (order) {
            order.orderStatus = newStatus;
        }
        updateOrderStats();
        showToast(`Order status updated to "${newStatus}"!`, 'success');
    } catch (err) {
        console.error('Error updating order status:', err);
        showToast(`Failed to update status: ${err.message}`, 'error');
        await loadOrders(); // Revert on failure
    }
}

function viewOrderDetails(orderId) {
    const order = state.orders.find(o => o._id === orderId);
    if (!order) return;

    const modalContent = document.getElementById('orderDetailsContent');
    const addr = order.shippingAddress || {};

    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px;">
            <div>
                <h4 style="margin: 0; color: #1e293b;">Order ID: <code>${order._id}</code></h4>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Placed on: ${new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div>
                <span class="badge badge-${(order.orderStatus || 'pending').toLowerCase()}" style="font-size: 14px; padding: 6px 12px;">
                    ${escapeHTML(order.orderStatus || 'Pending')}
                </span>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
            <div style="background: #f8fafc; padding: 14px; border-radius: 8px;">
                <h5 style="margin: 0 0 8px 0; color: #475569;">Customer & Shipping</h5>
                <p style="margin: 0; font-size: 13px; line-height: 1.5;">
                    <strong>${escapeHTML(addr.fullName || 'N/A')}</strong><br>
                    ${escapeHTML(addr.address || 'N/A')}<br>
                    ${escapeHTML(addr.city || 'N/A')}${addr.postalCode ? ', ' + escapeHTML(addr.postalCode) : ''}<br>
                    <strong>Phone:</strong> ${escapeHTML(addr.phone || 'N/A')}
                </p>
            </div>
            <div style="background: #f8fafc; padding: 14px; border-radius: 8px;">
                <h5 style="margin: 0 0 8px 0; color: #475569;">Payment & Pricing</h5>
                <p style="margin: 0; font-size: 13px; line-height: 1.5;">
                    <strong>Method:</strong> ${escapeHTML(order.paymentMethod || 'Cash on Delivery')}<br>
                    <strong>Payment Status:</strong> ${escapeHTML(order.paymentStatus || 'Pending')}<br>
                    <strong>Subtotal:</strong> ৳${Number(order.subtotal || 0).toFixed(2)}<br>
                    ${Number(order.discountAmount) > 0 ? `<strong style="color: #16a34a;">Discount (${escapeHTML(order.couponCode || 'PROMO')}):</strong> -৳${Number(order.discountAmount).toFixed(2)}<br>` : ''}
                    <strong>Shipping:</strong> ৳${Number(order.shippingFee || 0).toFixed(2)}<br>
                    <span style="font-size: 15px; color: #C8743A; font-weight: 700;">Grand Total: ৳${Number(order.totalAmount || 0).toFixed(2)}</span>
                </p>
            </div>
        </div>

        <h5 style="margin: 0 0 10px 0; color: #475569;">Itemized Products (${order.orderItems?.length || 0})</h5>
        <div class="table-responsive">
            <table class="admin-table" style="font-size: 13px;">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Product Name</th>
                        <th>Unit Price</th>
                        <th>Qty</th>
                        <th>Line Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${(order.orderItems || []).map(item => `
                        <tr>
                            <td>
                                <img src="${escapeHTML(item.image)}" alt="" class="product-thumb" style="width: 36px; height: 36px;" onerror="this.src='images/logo.png'">
                            </td>
                            <td><strong>${escapeHTML(item.name)}</strong></td>
                            <td>৳${Number(item.price).toFixed(2)}</td>
                            <td>${item.quantity}</td>
                            <td><strong>৳${(Number(item.price) * item.quantity).toFixed(2)}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('orderDetailsModal').classList.add('active');
}

function closeOrderDetailsModal() {
    document.getElementById('orderDetailsModal').classList.remove('active');
}

/**
 * 4.5 Coupon Management (CRUD)
 */
async function loadCoupons() {
    const tbody = document.getElementById('couponsTableBody');
    if (!tbody) return;
    try {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 30px;">Loading coupons...</td></tr>`;
        const coupons = await API.getCoupons();
        state.coupons = coupons || [];
        renderCouponsTable(state.coupons);
    } catch (error) {
        console.error('Error loading coupons:', error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #dc2626; padding: 30px;">Failed to load coupons: ${escapeHTML(error.message)}</td></tr>`;
    }
}

function renderCouponsTable(coupons) {
    const tbody = document.getElementById('couponsTableBody');
    if (!tbody) return;

    if (coupons.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 30px;">No coupons found. Click "Add Coupon" to create one.</td></tr>`;
        return;
    }

    tbody.innerHTML = coupons.map(c => `
        <tr>
            <td><strong style="color: #C8743A; font-size: 15px; font-family: monospace;">${escapeHTML(c.code)}</strong></td>
            <td><span class="badge" style="background:#e0e7ff; color:#3730a3;">${c.discountType === 'percentage' ? 'Percentage' : 'Flat Discount'}</span></td>
            <td><strong>${c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `৳${Number(c.discountValue).toFixed(2)} OFF`}</strong></td>
            <td>৳${Number(c.minOrderAmount || 0).toFixed(2)}</td>
            <td>
                <span class="badge ${c.isActive ? 'badge-delivered' : 'badge-cancelled'}">
                    ${c.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <button class="btn-action btn-delete" onclick="handleDeleteCoupon('${c._id}')" title="Delete Coupon">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openCouponModal() {
    document.getElementById('couponForm').reset();
    document.getElementById('couponModal').classList.add('active');
}

function closeCouponModal() {
    document.getElementById('couponModal').classList.remove('active');
}

async function handleCouponSubmit(e) {
    e.preventDefault();
    const code = document.getElementById('newCouponCode').value.trim().toUpperCase();
    const discountType = document.getElementById('newCouponType').value;
    const discountValue = parseFloat(document.getElementById('newCouponValue').value);
    const minOrderAmount = parseFloat(document.getElementById('newCouponMinOrder').value) || 0;
    const isActive = document.getElementById('newCouponIsActive').checked;

    try {
        const btn = document.getElementById('saveCouponBtn');
        if (btn) btn.disabled = true;
        await API.createCoupon({ code, discountType, discountValue, minOrderAmount, isActive });
        showToast(`Coupon "${code}" created successfully!`, 'success');
        closeCouponModal();
        await loadCoupons();
    } catch (err) {
        showToast(`Failed to create coupon: ${err.message}`, 'error');
    } finally {
        const btn = document.getElementById('saveCouponBtn');
        if (btn) btn.disabled = false;
    }
}

async function handleDeleteCoupon(id) {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
        await API.deleteCoupon(id);
        showToast('Coupon deleted successfully', 'success');
        await loadCoupons();
    } catch (err) {
        showToast(`Failed to delete coupon: ${err.message}`, 'error');
    }
}

// Global exposure
window.openCouponModal = openCouponModal;
window.closeCouponModal = closeCouponModal;
window.handleCouponSubmit = handleCouponSubmit;
window.handleDeleteCoupon = handleDeleteCoupon;
window.loadCoupons = loadCoupons;

/**
 * 5. Support Chat System (Customer-to-Admin)
 */
async function loadAdminConversations(isBackground = false) {
    const listEl = document.getElementById('adminConvList');
    const badgeEl = document.getElementById('adminUnreadBadge');
    const countEl = document.getElementById('adminConvCount');

    try {
        const conversations = await API.getAdminConversations();
        state.conversations = Array.isArray(conversations) ? conversations : [];

        // Count total unread messages from customers
        const totalUnread = state.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        if (badgeEl) {
            if (totalUnread > 0) {
                badgeEl.style.display = 'inline-block';
                badgeEl.textContent = totalUnread;
            } else {
                badgeEl.style.display = 'none';
            }
        }

        if (countEl) {
            countEl.textContent = `${state.conversations.length} active`;
        }

        if (!listEl) return;

        if (state.conversations.length === 0) {
            listEl.innerHTML = `<li style="padding: 24px; text-align: center; color: #94a3b8; font-size: 13px;">No customer inquiries yet.</li>`;
            return;
        }

        listEl.innerHTML = state.conversations.map(c => {
            const customerId = c._id;
            const isSelected = String(state.selectedCustomerId) === String(customerId);
            const activeClass = isSelected ? 'active' : '';
            const unreadBadge = (c.unreadCount && c.unreadCount > 0) 
                ? `<span class="conv-unread-badge">${c.unreadCount}</span>` 
                : '';
            const lastTime = c.lastCreatedAt ? new Date(c.lastCreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const senderPrefix = c.lastSenderRole === 'admin' ? '<span style="color:#C8743A; font-weight:600;">You: </span>' : '';

            return `
                <li class="conv-item ${activeClass}" onclick="selectCustomerConversation('${customerId}')">
                    <div class="conv-item-name">
                        <span><i class="fa-solid fa-circle-user" style="color:#64748b; margin-right:4px;"></i> ${escapeHTML(c.customerName || 'Customer')}</span>
                        <small style="color:#94a3b8; font-size:11px;">${lastTime}</small>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <span class="conv-item-preview">${senderPrefix}${escapeHTML(c.lastMessage || '')}</span>
                        ${unreadBadge}
                    </div>
                </li>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading admin conversations:', err);
        if (!isBackground && listEl) {
            listEl.innerHTML = `<li style="padding: 20px; text-align: center; color: #dc2626; font-size: 13px;">Failed to load conversations</li>`;
        }
    }
}

async function selectCustomerConversation(customerId) {
    state.selectedCustomerId = customerId;

    // Highlight conversation item
    const items = document.querySelectorAll('.conv-item');
    items.forEach(it => it.classList.remove('active'));

    const conv = state.conversations.find(c => String(c._id) === String(customerId));
    const customerName = conv ? conv.customerName : 'Customer';
    const customerEmail = conv ? conv.customerEmail : '';

    const nameEl = document.getElementById('adminActiveCustomerName');
    const emailEl = document.getElementById('adminActiveCustomerEmail');
    const replyForm = document.getElementById('adminReplyForm');

    if (nameEl) nameEl.textContent = customerName;
    if (emailEl) emailEl.textContent = customerEmail ? `Email: ${customerEmail}` : 'Customer ID: ' + customerId;
    if (replyForm) replyForm.style.display = 'flex';

    await loadActiveCustomerMessages();
    await loadAdminConversations(true);
}

async function loadActiveCustomerMessages(isBackground = false) {
    if (!state.selectedCustomerId) return;
    const box = document.getElementById('adminChatMessagesBox');
    if (!box) return;

    try {
        const messages = await API.getAdminCustomerMessages(state.selectedCustomerId);

        if (!Array.isArray(messages) || messages.length === 0) {
            box.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 40px;">
                    <p>No messages in this conversation yet.</p>
                </div>
            `;
            return;
        }

        box.innerHTML = messages.map(msg => {
            const isAdmin = msg.senderRole === 'admin';
            const wrapClass = isAdmin ? 'customer' : 'admin'; // admin uses 'customer' bubble style (right/brown) in this panel for clear visual distinction
            const senderName = isAdmin ? 'You (Pico Picks Support)' : (msg.customerName || msg.senderName || 'Customer');
            const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            return `
                <div class="chat-bubble-wrap ${wrapClass}">
                    <span class="chat-bubble-sender-name">
                        ${isAdmin ? '<i class="fa-solid fa-shield-halved" style="color:#C8743A; margin-right:3px;"></i>' : '<i class="fa-solid fa-user" style="color:#64748b; margin-right:3px;"></i>'}
                        ${escapeHTML(senderName)}
                    </span>
                    <div class="chat-bubble ${wrapClass}">
                        ${escapeHTML(msg.text)}
                    </div>
                    <span class="chat-bubble-time">${timeStr}</span>
                </div>
            `;
        }).join('');

        // Auto-scroll down
        box.scrollTop = box.scrollHeight;
    } catch (err) {
        console.error('Error loading active customer messages:', err);
    }
}

async function handleSendAdminReply(event) {
    event.preventDefault();
    if (!state.selectedCustomerId) {
        showToast('Please select a customer conversation first.', 'warning');
        return;
    }

    const input = document.getElementById('adminReplyText');
    const sendBtn = document.getElementById('adminReplyBtn');
    const text = input ? input.value.trim() : '';

    if (!text) return;

    try {
        if (sendBtn) sendBtn.disabled = true;
        input.value = '';

        await API.sendAdminReply(state.selectedCustomerId, text);
        await loadActiveCustomerMessages();
        await loadAdminConversations(true);
    } catch (err) {
        showToast(`Failed to send reply: ${err.message}`, 'error');
    } finally {
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.focus();
    }
}

window.loadAdminConversations = loadAdminConversations;
window.selectCustomerConversation = selectCustomerConversation;
window.loadActiveCustomerMessages = loadActiveCustomerMessages;
window.handleSendAdminReply = handleSendAdminReply;

/**
 * 6. Initialization
 */
document.addEventListener('DOMContentLoaded', async () => {
    const isAuthorized = await checkAdminAuth();
    if (!isAuthorized) return;

    // Load initial tab
    await loadProducts();
    // Also load orders in background to populate stat cards
    try {
        const orders = await API.request('/orders');
        state.orders = orders || [];
        updateOrderStats();
    } catch (e) {
        console.warn('Silent order fetch for stats:', e.message);
    }

    // Load conversations in background to update unread badge on sidebar
    try {
        await loadAdminConversations(true);
    } catch (e) {
        console.warn('Silent conversations fetch:', e.message);
    }
});
