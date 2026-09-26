/**
 * Pico Picks API Client Service
 * Handles all fetch HTTP requests and JWT token headers for full-stack communication
 */

const API_BASE_URL = '/api';
const TOKEN_KEY = 'pico_token';

const API = {
    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    },

    setToken(token) {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    },

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...(options.headers || {})
            }
        };

        try {
            const response = await fetch(url, config);
            const contentType = response.headers.get('content-type') || '';
            let data = null;

            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                if (!response.ok) {
                    throw new Error(text || `Server error (Status ${response.status})`);
                }
                data = { message: text };
            }

            if (!response.ok) {
                throw new Error((data && data.error) ? data.error : `HTTP error! status: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error.message);
            throw error;
        }
    },

    // Auth endpoints
    async register(username, email, password, role = 'customer') {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, role })
        });
        if (data.token) this.setToken(data.token);
        if (data.user) localStorage.setItem('pico_current_user', JSON.stringify(data.user));
        return data;
    },

    async login(username, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        if (data.token) this.setToken(data.token);
        if (data.user) localStorage.setItem('pico_current_user', JSON.stringify(data.user));
        return data;
    },

    async getProfile() {
        const data = await this.request('/auth/me');
        if (data) localStorage.setItem('pico_current_user', JSON.stringify(data));
        return data;
    },

    async updateProfile(profileData) {
        const data = await this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
        if (data && data.user) {
            localStorage.setItem('pico_current_user', JSON.stringify(data.user));
        }
        return data;
    },

    // Product endpoints
    async getProducts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/products${queryString ? '?' + queryString : ''}`;
        return await this.request(endpoint);
    },

    async getProductById(id) {
        return await this.request(`/products/${id}`);
    },

    async addProductReview(productId, reviewData) {
        return await this.request(`/products/${productId}/reviews`, {
            method: 'POST',
            body: JSON.stringify(reviewData)
        });
    },

    // Cart endpoints
    async getCart() {
        return await this.request('/cart');
    },

    async addToCart(productId, quantity = 1, color = '') {
        return await this.request('/cart/add', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity, color: color || '' })
        });
    },

    async updateCart(productId, quantity) {
        return await this.request('/cart/update', {
            method: 'PUT',
            body: JSON.stringify({ productId, quantity })
        });
    },

    async removeFromCart(productId) {
        return await this.request(`/cart/remove/${productId}`, {
            method: 'DELETE'
        });
    },

    async clearCart() {
        return await this.request('/cart/clear', {
            method: 'DELETE'
        });
    },

    // Order endpoints
    async createOrder(orderData) {
        return await this.request('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    },

    async getMyOrders() {
        return await this.request('/orders/my-orders');
    },

    async getOrderById(id) {
        return await this.request(`/orders/${id}`);
    },

    // Coupon endpoints
    async validateCoupon(code, subtotal) {
        return await this.request('/coupons/validate', {
            method: 'POST',
            body: JSON.stringify({ code, subtotal })
        });
    },

    async getCoupons() {
        return await this.request('/coupons');
    },

    async createCoupon(couponData) {
        return await this.request('/coupons', {
            method: 'POST',
            body: JSON.stringify(couponData)
        });
    },

    async deleteCoupon(id) {
        return await this.request(`/coupons/${id}`, {
            method: 'DELETE'
        });
    },

    // Message / Support Chat endpoints
    async getCustomerMessages() {
        return await this.request('/messages');
    },

    async sendCustomerMessage(text) {
        return await this.request('/messages', {
            method: 'POST',
            body: JSON.stringify({ text })
        });
    },

    async markCustomerMessagesRead() {
        return await this.request('/messages/read', {
            method: 'PUT'
        });
    },

    async getAdminConversations() {
        return await this.request('/messages/conversations');
    },

    async getAdminCustomerMessages(customerId) {
        return await this.request(`/messages/customer/${customerId}`);
    },

    async sendAdminReply(customerId, text) {
        return await this.request(`/messages/customer/${customerId}`, {
            method: 'POST',
            body: JSON.stringify({ text })
        });
    },

    async markAdminMessagesRead(customerId) {
        return await this.request(`/messages/customer/${customerId}/read`, {
            method: 'PUT'
        });
    }
};

window.API = API;
