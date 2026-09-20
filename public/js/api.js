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

    getHeaders(isAuthRequired = false) {
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
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error.message);
            throw error;
        }
    },

    // Auth endpoints
    async register(username, email, password) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
        if (data.token) this.setToken(data.token);
        return data;
    },

    async login(username, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        if (data.token) this.setToken(data.token);
        return data;
    },

    async getProfile() {
        return await this.request('/auth/me');
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

    // Cart endpoints
    async getCart() {
        return await this.request('/cart');
    },

    async addToCart(productId, quantity = 1) {
        return await this.request('/cart/add', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity })
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
    }
};

window.API = API;
