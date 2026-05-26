// js/auth.js
// Handles login and register form logic.
// Runs only on login.html

document.addEventListener('DOMContentLoaded', () => {

    // If already logged in, redirect to correct dashboard
    const user = getUser();
    if (user) {
        redirectToDashboard(user.role);
    }

    // ── Tab switching (Login / Register) ──────────────────────────
    const tabs = document.querySelectorAll('.tab');
    const loginForm    = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.dataset.tab;
            // data-tab="login" or data-tab="register"

            if (target === 'login') {
                loginForm.style.display    = 'block';
                registerForm.style.display = 'none';
            } else {
                loginForm.style.display    = 'none';
                registerForm.style.display = 'block';
            }
        });
    });

    // ── Role toggle (shows company field for recruiters) ──────────
    const roleSelect    = document.getElementById('reg-role');
    const companyGroup  = document.getElementById('company-group');

    roleSelect?.addEventListener('change', () => {
        companyGroup.style.display =
            roleSelect.value === 'recruiter' ? 'flex' : 'none';
    });

    // ── Login form submit ─────────────────────────────────────────
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        // e.preventDefault() stops the browser from reloading the page
        // We handle the submit ourselves with fetch()

        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const alert    = document.getElementById('login-alert');
        const btn      = document.getElementById('login-btn');

        setLoading(btn, true);
        hideAlert(alert);

        try {
            await Auth.login(username, password);
            // Tokens are now saved in localStorage

            const user = await Auth.getMe();
            // Fetch user info to know their role
            saveUser(user);

            redirectToDashboard(user.role);

        } catch (err) {
            showAlert(alert, 'Invalid username or password.', 'danger');
        } finally {
            setLoading(btn, false);
            // finally always runs — re-enable button even if error
        }
    });

    // ── Register form submit ──────────────────────────────────────
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('reg-username').value;
        const email    = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const role     = document.getElementById('reg-role').value;
        const company  = document.getElementById('reg-company')?.value || '';
        const alert    = document.getElementById('register-alert');
        const btn      = document.getElementById('register-btn');

        setLoading(btn, true);
        hideAlert(alert);

        try {
            const data = await Auth.register(username, email, password, role, company);
            // data = { user, tokens }

            saveTokens(data.tokens.access, data.tokens.refresh);
            saveUser(data.user);

            redirectToDashboard(data.user.role);

        } catch (err) {
            const errors = JSON.parse(err.message);
            // Extract first error message from DRF error response
            const msg = Object.values(errors)[0]?.[0] || 'Registration failed.';
            showAlert(alert, msg, 'danger');
        } finally {
            setLoading(btn, false);
        }
    });
});

// ── Helper functions ──────────────────────────────────────────────
function redirectToDashboard(role) {
    if (role === 'recruiter') {
        window.location.href = '/frontend/recruiter.html';
    } else {
        window.location.href = '/frontend/candidate.html';
    }
}

function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.innerHTML = loading
        ? '<span class="spinner"></span> Please wait...'
        : btn.dataset.label;
    // data-label stores the original button text
}

function showAlert(el, msg, type) {
    el.textContent = msg;
    el.className = `alert alert-${type} show`;
}

function hideAlert(el) {
    el.classList.remove('show');
}