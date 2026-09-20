/**
 * Pico Picks User Authentication Script (Full-Stack JWT API + Local Fallback)
 */

async function getCurrentUser() {
    if (window.API && API.getToken()) {
        try {
            return await API.getProfile();
        } catch (e) {
            console.warn('Invalid JWT token or user profile fetch error:', e.message);
            API.setToken(null);
        }
    }
    const local = localStorage.getItem('pico_current_user');
    return local ? JSON.parse(local) : null;
}

function renderAuthDashboard(user) {
    const formContainer = document.querySelector('.form-container');
    if (!formContainer || !user) return;

    formContainer.innerHTML = `
        <div style="text-align: center; padding: 20px 10px;">
            <i class="fa-solid fa-circle-user" style="font-size: 50px; color: #C8743A; margin-bottom: 15px;"></i>
            <h2 style="color: #2f2a24; margin-bottom: 10px;">Welcome, ${escapeHTML(user.username)}!</h2>
            <p style="color: #666; margin-bottom: 20px;">Email: ${escapeHTML(user.email || 'N/A')}</p>
            <div style="display: flex; flex-direction: column; gap: 10px; max-width: 200px; margin: 0 auto;">
                <a href="cart.html" class="btn" style="display: inline-block;">My Shopping Cart</a>
                <button id="logoutBtn" class="btn" style="background: #333; color: #fff; cursor: pointer; border: none;">Logout</button>
            </div>
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

    // Handle Login Form
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

            // Call Express API
            if (window.API) {
                try {
                    const data = await API.login(usernameInput, passwordInput);
                    alert(`Welcome back, ${data.user.username}!`);
                    renderAuthDashboard(data.user);
                    return;
                } catch (err) {
                    alert(err.message || 'Login failed.');
                    return;
                }
            }
        });
    }

    // Handle Registration Form
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

            // Call Express API
            if (window.API) {
                try {
                    const data = await API.register(username, email, password);
                    alert(`Account registered successfully! Welcome to Pico Picks, ${data.user.username}.`);
                    renderAuthDashboard(data.user);
                    return;
                } catch (err) {
                    alert(err.message || 'Registration failed.');
                    return;
                }
            }
        });
    }
});
