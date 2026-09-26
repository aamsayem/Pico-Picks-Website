/**
 * Pico Picks Toast Notification & Navbar Utilities
 * Provides sleek in-website toast alerts, navbar search toggle with live search, and reactive cart badges.
 */

(function () {
    'use strict';

    // -------------------------------------------------------------
    // 1. Toast Notification System
    // -------------------------------------------------------------
    function ensureToastContainer() {
        let container = document.getElementById('picoToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'picoToastContainer';
            container.className = 'pico-toast-container';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(container);
        }
        return container;
    }

    function escapeToastHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g, function (tag) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag;
        });
    }

    const TOAST_ICONS = {
        success: 'fa-solid fa-circle-check',
        error: 'fa-solid fa-circle-xmark',
        warning: 'fa-solid fa-triangle-exclamation',
        info: 'fa-solid fa-circle-info'
    };

    /**
     * Show custom animated in-website toast notification
     * @param {string} message - Toast message text
     * @param {'success'|'error'|'info'|'warning'} [type='info'] - Style variant
     * @param {number} [duration=3500] - Duration in ms before auto-dismiss
     */
    window.showToast = function (message, type = 'info', duration = 3500) {
        if (!message) return;
        const validTypes = ['success', 'error', 'info', 'warning'];
        const toastType = validTypes.includes(type) ? type : 'info';

        const container = ensureToastContainer();
        const toast = document.createElement('div');
        toast.className = `pico-toast-card pico-toast-${toastType}`;
        toast.setAttribute('role', toastType === 'error' ? 'alert' : 'status');

        const iconClass = TOAST_ICONS[toastType] || TOAST_ICONS.info;

        toast.innerHTML = `
            <div class="pico-toast-icon">
                <i class="${iconClass}"></i>
            </div>
            <div class="pico-toast-body">
                <div class="pico-toast-message">${escapeToastHTML(message)}</div>
            </div>
            <button type="button" class="pico-toast-close" aria-label="Close notification">&times;</button>
            <div class="pico-toast-progress" style="animation-duration: ${duration}ms;"></div>
        `;

        container.appendChild(toast);

        let dismissTimeout = null;
        let isDismissed = false;

        function dismissToast() {
            if (isDismissed) return;
            isDismissed = true;
            if (dismissTimeout) clearTimeout(dismissTimeout);
            toast.classList.add('pico-toast-leave');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }

        const closeBtn = toast.querySelector('.pico-toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', dismissToast);
        }

        // Auto-dismiss with pause on hover
        dismissTimeout = setTimeout(dismissToast, duration);

        toast.addEventListener('mouseenter', () => {
            if (dismissTimeout) clearTimeout(dismissTimeout);
            const progress = toast.querySelector('.pico-toast-progress');
            if (progress) progress.style.animationPlayState = 'paused';
        });

        toast.addEventListener('mouseleave', () => {
            const progress = toast.querySelector('.pico-toast-progress');
            if (progress) progress.style.animationPlayState = 'running';
            dismissTimeout = setTimeout(dismissToast, 1500);
        });
    };

    // Override browser native alert() to always use sleek custom toast
    window.alert = function (msg) {
        if (typeof msg !== 'string') {
            try { msg = JSON.stringify(msg); } catch (e) { msg = String(msg); }
        }
        let type = 'info';
        const lower = (msg || '').toLowerCase();
        if (lower.includes('success') || lower.includes('welcome') || lower.includes('added to your cart')) {
            type = 'success';
        } else if (lower.includes('error') || lower.includes('failed') || lower.includes('denied') || lower.includes('restricted') || lower.includes('could not')) {
            type = 'error';
        } else if (lower.includes('please fill') || lower.includes('select at least') || lower.includes('empty')) {
            type = 'warning';
        }
        window.showToast(msg, type);
    };

    // -------------------------------------------------------------
    // 2. Navbar Reactive Cart Badges
    // -------------------------------------------------------------
    window.updateCartNavBadges = async function () {
        let totalCount = 0;
        try {
            if (window.API && typeof window.API.getToken === 'function' && window.API.getToken()) {
                const apiCart = await window.API.getCart();
                if (Array.isArray(apiCart)) {
                    totalCount = apiCart.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
                }
            } else {
                const raw = localStorage.getItem('pico_cart');
                const local = raw ? JSON.parse(raw) : [];
                if (Array.isArray(local)) {
                    totalCount = local.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
                }
            }
        } catch (e) {
            try {
                const raw = localStorage.getItem('pico_cart');
                const local = raw ? JSON.parse(raw) : [];
                totalCount = local.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
            } catch (_) {}
        }

        const badges = document.querySelectorAll('.nav-cart-count, #navCartCount');
        badges.forEach(badge => {
            badge.textContent = totalCount;
            badge.style.display = totalCount > 0 ? 'inline-flex' : 'none';
        });
    };

    // Listen for storage events across tabs or local cart updates
    window.addEventListener('storage', function (e) {
        if (e.key === 'pico_cart') {
            window.updateCartNavBadges();
        }
    });

    window.addEventListener('pico_cart_updated', function () {
        window.updateCartNavBadges();
    });

    // -------------------------------------------------------------
    // 3. Navbar Search Bar (Expandable + Live Search)
    // -------------------------------------------------------------
    let cachedProducts = null;
    async function loadSearchCatalog() {
        if (cachedProducts && cachedProducts.length > 0) return cachedProducts;
        if (window.API && typeof window.API.getProducts === 'function') {
            try {
                const data = await window.API.getProducts();
                if (Array.isArray(data) && data.length > 0) {
                    cachedProducts = data;
                    return cachedProducts;
                }
            } catch (e) {}
        }
        if (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS) && PRODUCTS.length > 0) {
            cachedProducts = PRODUCTS;
            return cachedProducts;
        }
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            if (Array.isArray(data)) {
                cachedProducts = data;
                return cachedProducts;
            }
        } catch (e) {}
        return [];
    }

    window.toggleNavSearch = function () {
        const dropdown = document.getElementById('navSearchDropdown');
        const input = document.getElementById('navSearchInput');
        if (!dropdown) return;

        const isOpen = dropdown.classList.contains('active');
        if (isOpen) {
            dropdown.classList.remove('active');
        } else {
            dropdown.classList.add('active');
            if (input) {
                setTimeout(() => {
                    input.focus();
                    if (input.value.trim()) {
                        performLiveSearch(input.value.trim());
                    }
                }, 120);
            }
        }
    };

    window.closeNavSearch = function () {
        const dropdown = document.getElementById('navSearchDropdown');
        if (dropdown) dropdown.classList.remove('active');
    };

    window.submitNavSearch = function () {
        const input = document.getElementById('navSearchInput');
        const query = input ? input.value.trim() : '';
        if (!query) return;
        window.location.href = `products.html?search=${encodeURIComponent(query)}`;
    };

    async function performLiveSearch(query) {
        const resultsEl = document.getElementById('navSearchResults');
        if (!resultsEl) return;

        if (!query || query.length < 1) {
            resultsEl.innerHTML = '';
            resultsEl.style.display = 'none';
            return;
        }

        resultsEl.style.display = 'block';
        resultsEl.innerHTML = '<div class="nav-search-loading"><i class="fa-solid fa-spinner fa-spin"></i> Searching products...</div>';

        const catalog = await loadSearchCatalog();
        const q = query.toLowerCase();

        const matches = catalog.filter(p => {
            const name = (p.name || '').toLowerCase();
            const desc = (p.description || '').toLowerCase();
            const cat = (p.category || '').toLowerCase();
            return name.includes(q) || desc.includes(q) || cat.includes(q);
        }).slice(0, 6);

        if (matches.length === 0) {
            resultsEl.innerHTML = `
                <div class="nav-search-empty">
                    <p>No products found for "<strong>${escapeToastHTML(query)}</strong>"</p>
                    <a href="products.html" class="nav-search-view-all">Browse Full Catalog &#10140;</a>
                </div>
            `;
            return;
        }

        resultsEl.innerHTML = `
            <div class="nav-search-list">
                ${matches.map(p => {
                    const id = encodeURIComponent(p.id || p._id);
                    const price = Number(p.price || 0).toFixed(2);
                    return `
                        <a href="product-details.html?id=${id}" class="nav-search-item">
                            <img src="${p.image}" alt="${escapeToastHTML(p.name)}" onerror="this.src='images/logo.png'">
                            <div class="nav-search-item-info">
                                <div class="nav-search-item-name">${escapeToastHTML(p.name)}</div>
                                <div class="nav-search-item-price">৳${price}</div>
                            </div>
                            <i class="fa-solid fa-chevron-right nav-search-item-arrow"></i>
                        </a>
                    `;
                }).join('')}
            </div>
            <div class="nav-search-footer">
                <a href="products.html?search=${encodeURIComponent(query)}">
                    View all results for "${escapeToastHTML(query)}" &#10140;
                </a>
            </div>
        `;
    }

    // Auto-initialize once DOM is ready
    document.addEventListener('DOMContentLoaded', function () {
        ensureToastContainer();
        window.updateCartNavBadges();

        const searchToggle = document.getElementById('navSearchToggle');
        const searchClose = document.getElementById('navSearchClose');
        const searchInput = document.getElementById('navSearchInput');
        const searchDropdown = document.getElementById('navSearchDropdown');

        if (searchToggle) {
            searchToggle.addEventListener('click', function (e) {
                e.stopPropagation();
                window.toggleNavSearch();
            });
        }

        if (searchClose) {
            searchClose.addEventListener('click', function (e) {
                e.stopPropagation();
                window.closeNavSearch();
            });
        }

        if (searchInput) {
            let debounceTimer = null;
            searchInput.addEventListener('input', function () {
                clearTimeout(debounceTimer);
                const val = searchInput.value.trim();
                debounceTimer = setTimeout(() => {
                    performLiveSearch(val);
                }, 220);
            });

            searchInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window.submitNavSearch();
                } else if (e.key === 'Escape') {
                    window.closeNavSearch();
                }
            });
        }

        // Close search dropdown on click outside
        document.addEventListener('click', function (e) {
            if (searchDropdown && searchDropdown.classList.contains('active')) {
                if (!searchDropdown.contains(e.target) && !searchToggle.contains(e.target)) {
                    window.closeNavSearch();
                }
            }
        });
    });

})();
