// js/api.js
// Central place for all API calls.
// Every function returns the parsed JSON response.
// Views just call these functions — no fetch() anywhere else.

const BASE_URL = 'http://127.0.0.1:8000/api';

// ── Token helpers ─────────────────────────────────────────────────
// Tokens are stored in localStorage so they persist across page refreshes

function getAccessToken() {
    return localStorage.getItem('access_token');
}

function getRefreshToken() {
    return localStorage.getItem('refresh_token');
}

function saveTokens(access, refresh) {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
}

function clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
}

function saveUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function getUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
}

// ── Base fetch wrapper ────────────────────────────────────────────
// All API calls go through this function.
// It automatically adds the Authorization header if a token exists.

async function apiFetch(endpoint, options = {}) {
    const token = getAccessToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        // If token exists, add Authorization header
        // The ... spread merges it into the headers object
        ...options.headers,
    };

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    // If token expired (401), try to refresh it automatically
    if (response.status === 401) {
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            // Retry the original request with new token
            return apiFetch(endpoint, options);
        } else {
            // Refresh failed — log out
            clearTokens();
            window.location.href = '/frontend/login.html';
            return;
        }
    }

    // Parse response as JSON
    const data = await response.json().catch(() => ({}));
    // .catch(() => ({})) handles empty responses (like 204 No Content)

    if (!response.ok) {
        // Attach status code to error so caller can check it
        const error = new Error(JSON.stringify(data));
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

// ── Refresh token logic ───────────────────────────────────────────
async function tryRefreshToken() {
    const refresh = getRefreshToken();
    if (!refresh) return false;

    try {
        const res = await fetch(`${BASE_URL}/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });

        if (res.ok) {
            const data = await res.json();
            saveTokens(data.access, refresh);
            // Save new access token, keep same refresh token
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

// ── Auth API ──────────────────────────────────────────────────────
const Auth = {
    async register(username, email, password, role, company = '') {
        return apiFetch('/accounts/register/', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, role, company }),
        });
    },

    async login(username, password) {
        const data = await apiFetch('/token/', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        // data = { access, refresh }
        saveTokens(data.access, data.refresh);
        return data;
    },

    async getMe() {
        return apiFetch('/accounts/me/');
    },

    logout() {
        clearTokens();
        window.location.href = '/frontend/login.html';
    },
};

// ── Jobs API ──────────────────────────────────────────────────────
const Jobs = {
    async list(filters = {}) {
        // Build query string from filters object
        // e.g. { category: 'engineering' } → '?category=engineering'
        const params = new URLSearchParams(filters).toString();
        return apiFetch(`/jobs/${params ? '?' + params : ''}`);
    },

    async get(id) {
        return apiFetch(`/jobs/${id}/`);
    },

    async create(jobData) {
        return apiFetch('/jobs/', {
            method: 'POST',
            body: JSON.stringify(jobData),
        });
    },

    async update(id, jobData) {
        return apiFetch(`/jobs/${id}/`, {
            method: 'PUT',
            body: JSON.stringify(jobData),
        });
    },

    async delete(id) {
        return apiFetch(`/jobs/${id}/`, {
            method: 'DELETE',
        });
    },
};

// ── Applications API ──────────────────────────────────────────────
const Applications = {
    async list() {
        return apiFetch('/applications/');
    },

    async get(id) {
        return apiFetch(`/applications/${id}/`);
    },

    async apply(jobId, resumeText, coverLetter = '') {
        return apiFetch('/applications/', {
            method: 'POST',
            body: JSON.stringify({
                job: jobId,
                resume_text: resumeText,
                cover_letter: coverLetter,
            }),
        });
    },

    async updateStatus(id, status) {
        return apiFetch(`/applications/${id}/`, {
            method: 'PUT',
            body: JSON.stringify({ status }),
        });
    },
};

// js/api.js
// ── Add this at the very bottom ───────────────────────────────────

function sanitize(str) {
    // Protects against XSS attacks
    // Converts <script> to &lt;script&gt; so it displays as text, not code
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}