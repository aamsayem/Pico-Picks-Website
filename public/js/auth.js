/**
 * Pico Picks User Authentication Script (Full-Stack JWT API)
 */

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

async function getCurrentUser() {
    if (window.API && API.getToken()) {
        try {
            return await API.getProfile();
        } catch (e) {
            console.warn('Session expired or invalid token:', e.message);
            API.setToken(null);
            localStorage.removeItem('pico_current_user');
        }
    }
    const local = localStorage.getItem('pico_current_user');
    return local ? JSON.parse(local) : null;
}

async function renderAuthDashboard(user) {
    const formContainer = document.querySelector('.form-container');
    if (!formContainer || !user) return;

    // Fetch user orders if available
    let ordersHTML = '';
    try {
        if (window.API && API.getToken()) {
            const orders = await API.getMyOrders();
            if (orders && orders.length > 0) {
                ordersHTML = `
                    <div style="margin-top: 25px; text-align: left; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                        <h4 style="color: #2f2a24; margin-bottom: 10px; font-size: 16px;">My Order History (${orders.length})</h4>
                        <div style="max-height: 200px; overflow-y: auto; font-size: 13px;">
                            ${orders.map(o => `
                                <div style="background: #f8fafc; padding: 10px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #e2e8f0;">
                                    <div style="display: flex; justify-content: space-between; font-weight: 600;">
                                        <span>Order #${o._id ? o._id.substring(0, 8) : 'N/A'}</span>
                                        <span style="color: #C8743A;">৳${Number(o.totalAmount || 0).toFixed(2)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; color: #64748b; font-size: 12px; margin-top: 4px;">
                                        <span>Status: <strong>${escapeHTML(o.orderStatus || 'Pending')}</strong></span>
                                        <span>${new Date(o.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        }
    } catch (e) {
        console.warn('Silent failure loading my orders:', e.message);
    }

    const isAdmin = user.role === 'admin';

    formContainer.innerHTML = `
        <div style="text-align: center; padding: 20px 10px;">
            <i class="fa-solid fa-circle-user" style="font-size: 50px; color: #C8743A; margin-bottom: 15px;"></i>
            <h2 style="color: #2f2a24; margin-bottom: 6px;">Welcome, ${escapeHTML(user.username)}!</h2>
            <p style="color: #64748b; margin-bottom: 15px; font-size: 14px;">
                Email: ${escapeHTML(user.email || 'N/A')}
                ${isAdmin ? '<br><span style="display:inline-block; margin-top:4px; padding:2px 8px; background:#fef3c7; color:#b45309; border-radius:12px; font-size:11px; font-weight:700;">ADMINISTRATOR</span>' : ''}
            </p>
            
            <div style="display: flex; flex-direction: column; gap: 8px; max-width: 220px; margin: 0 auto;">
                ${isAdmin ? '<a href="admin.html" class="btn" style="background: #1e293b; color: #fff; display: block; margin: 0;">Admin Dashboard</a>' : ''}
                <a href="cart.html" class="btn" style="display: block; margin: 0;">My Shopping Cart</a>
                <button id="logoutBtn" class="btn" style="background: #475569; color: #fff; cursor: pointer; border: none; margin: 0;">Logout</button>
            </div>

            ${ordersHTML}
        </div>
    `;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = function() {
            if (window.API) API.setToken(null);
            localStorage.removeItem('pico_current_user');
            alert('You have successfully logged out.');
            window.location.reload();
        };
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const loginForm = document.getElementById('LoginForm');
    const regForm = document.getElementById('RegForm');

    // Check if active user session exists
    const currentUser = await getCurrentUser();
    if (currentUser) {
        renderAuthDashboard(currentUser);
        return;
    }

    // Handle Login Form submission via API
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const inputs = loginForm.querySelectorAll('input');
            const usernameInput = inputs[0] ? inputs[0].value.trim() : '';
            const passwordInput = inputs[1] ? inputs[1].value : '';

            if (!usernameInput || !passwordInput) {
                alert('Please enter both username and password.');
                return;
            }

            try {
                const data = await API.login(usernameInput, passwordInput);
                alert(`Welcome back, ${data.user.username}!`);
                renderAuthDashboard(data.user);
            } catch (err) {
                alert(err.message || 'Login failed. Please verify your credentials.');
            }
        });
    }

    // Handle Registration Form submission via API
    if (regForm) {
        regForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const inputs = regForm.querySelectorAll('input');
            const username = inputs[0] ? inputs[0].value.trim() : '';
            const email = inputs[1] ? inputs[1].value.trim() : '';
            const password = inputs[2] ? inputs[2].value : '';

            if (!username || !email || !password) {
                alert('Please fill out all registration fields.');
                return;
            }

            if (password.length < 4) {
                alert('Password must be at least 4 characters long.');
                return;
            }

            try {
                const data = await API.register(username, email, password);
                alert(`Account registered successfully! Welcome to Pico Picks, ${data.user.username}.`);
                renderAuthDashboard(data.user);
            } catch (err) {
                alert(err.message || 'Registration failed.');
            }
        });
    }
});
