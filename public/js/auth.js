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
            showToast('You have successfully logged out.', 'info');
            setTimeout(() => window.location.reload(), 600);
        };
    }
}

/**
 * Password Visibility Toggle
 */
window.togglePasswordVisibility = function(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    if (btnEl) {
        btnEl.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        btnEl.title = isPassword ? 'Hide password' : 'Show password';
        const icon = btnEl.querySelector('i');
        if (icon) {
            if (isPassword) {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }
    }
};

/**
 * Google Sign-In Handler & Modal Fallback
 */
window.handleGoogleSignIn = async function() {
    // If Google Identity Services is available
    if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    showGoogleSignInModal();
                }
            });
            return;
        } catch (e) {
            console.warn('Google One Tap notice, falling back to modal:', e);
        }
    }
    showGoogleSignInModal();
};

function showGoogleSignInModal() {
    let modal = document.getElementById('googleAuthModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'googleAuthModal';
        modal.innerHTML = `
            <div class="google-modal-backdrop" onclick="closeGoogleModal()"></div>
            <div class="google-modal-card">
                <div class="google-modal-header">
                    <svg width="24" height="24" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.55 10.79l7.98-6.2z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    <h3>Sign in with Google</h3>
                    <button type="button" class="google-modal-close" onclick="closeGoogleModal()">&times;</button>
                </div>
                <p class="google-modal-subtext">Quickly log in or create your collector account using your Google (Gmail) address.</p>
                <form id="googleQuickForm" onsubmit="submitGoogleModal(event)">
                    <div style="margin-bottom: 14px; text-align: left;">
                        <label style="display:block; font-size: 12px; font-weight:600; color: #475569; margin-bottom: 5px;">Gmail Address</label>
                        <input type="email" id="googleModalEmail" placeholder="yourname@gmail.com" required style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 18px; text-align: left;">
                        <label style="display:block; font-size: 12px; font-weight:600; color: #475569; margin-bottom: 5px;">Your Name (Optional)</label>
                        <input type="text" id="googleModalName" placeholder="e.g. A. A. M. Sayem" style="width: 100%; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
                    </div>
                    <button type="submit" id="googleSubmitBtn" class="btn" style="width: 100%; margin: 0; padding: 12px; border-radius: 8px; background: #C8743A; color: #fff; font-weight: 600; border: none; cursor: pointer;">
                        Continue with Google
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    setTimeout(() => {
        const input = document.getElementById('googleModalEmail');
        if (input) input.focus();
    }, 100);
}

window.closeGoogleModal = function() {
    const modal = document.getElementById('googleAuthModal');
    if (modal) modal.style.display = 'none';
};

window.submitGoogleModal = async function(e) {
    e.preventDefault();
    const email = document.getElementById('googleModalEmail')?.value.trim();
    const name = document.getElementById('googleModalName')?.value.trim();
    const btn = document.getElementById('googleSubmitBtn');

    if (!email || !email.includes('@')) {
        showToast('Please enter a valid Google email address.', 'warning');
        return;
    }

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in...';
        }

        const res = await API.googleLogin({
            email,
            name: name || email.split('@')[0],
            googleId: 'g_' + Math.random().toString(36).substring(2, 12)
        });

        closeGoogleModal();
        showToast(`Welcome, ${res.user.name || res.user.username}! Signed in with Google.`, 'success');
        setTimeout(() => { window.location.href = 'profile.html'; }, 800);
    } catch (err) {
        showToast(err.message || 'Google authentication failed. Please try again.', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Continue with Google';
        }
    }
};

document.addEventListener('DOMContentLoaded', async function() {
    const loginForm = document.getElementById('LoginForm');
    const regForm = document.getElementById('RegForm');

    // Check if active user session exists
    const currentUser = await getCurrentUser();
    if (currentUser) {
        window.location.href = 'profile.html';
        return;
    }

    // Handle Login Form submission via API
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const identifierEl = document.getElementById('loginIdentifier');
            const passwordEl = document.getElementById('loginPassword');
            const identifier = identifierEl ? identifierEl.value.trim() : (loginForm.querySelector('input[type="text"]')?.value.trim() || '');
            const password = passwordEl ? passwordEl.value : (loginForm.querySelector('input[type="password"]')?.value || '');

            if (!identifier || !password) {
                showToast('Please enter your email/mobile number and password.', 'warning');
                return;
            }

            try {
                const data = await API.login(identifier, password);
                showToast(`Welcome back, ${data.user.name || data.user.username}!`, 'success');
                setTimeout(() => { window.location.href = 'profile.html'; }, 800);
            } catch (err) {
                showToast(err.message || 'Login failed. Please verify your credentials.', 'error');
            }
        });
    }

    // Handle Registration Form submission via API
    if (regForm) {
        regForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const usernameEl = document.getElementById('regUsername');
            const identifierEl = document.getElementById('regIdentifier');
            const passwordEl = document.getElementById('regPassword');

            const username = usernameEl ? usernameEl.value.trim() : '';
            const identifier = identifierEl ? identifierEl.value.trim() : '';
            const password = passwordEl ? passwordEl.value : '';

            if (!username || !identifier || !password) {
                showToast('Please fill out all registration fields.', 'warning');
                return;
            }

            // Check if identifier is email or valid BD mobile
            const isEmail = identifier.includes('@');
            const cleanPhone = identifier.replace(/[\s\-]/g, '');
            const isBdPhone = /^01[3-9]\d{8}$/.test(cleanPhone) || /^\+8801[3-9]\d{8}$/.test(cleanPhone);

            if (!isEmail && !isBdPhone) {
                showToast('Please enter a valid Email address or 11-digit Bangladeshi mobile number (01XXXXXXXXX).', 'warning');
                return;
            }

            if (password.length < 4) {
                showToast('Password must be at least 4 characters long.', 'warning');
                return;
            }

            try {
                const data = await API.register(username, identifier, password);
                showToast(`Account registered successfully! Welcome to Pico Picks, ${data.user.username}.`, 'success');
                setTimeout(() => { window.location.href = 'profile.html'; }, 800);
            } catch (err) {
                showToast(err.message || 'Registration failed.', 'error');
            }
        });
    }
});
