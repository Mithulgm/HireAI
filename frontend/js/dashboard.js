// js/dashboard.js
// Handles both recruiter.html and candidate.html

const user = getUser();

// ── Auth guard ────────────────────────────────────────────────────
// If not logged in, redirect to login page
if (!user) {
    window.location.href = '/frontend/login.html';
}

document.addEventListener('DOMContentLoaded', async () => {
    // Show username in navbar
    const navUsername = document.getElementById('nav-username');
    if (navUsername) navUsername.textContent = `👤 ${user.username}`;

    // Logout button
    document.getElementById('nav-logout')?.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
    });

    // Load data based on role
    if (user.role === 'recruiter') {
        await loadRecruiterDashboard();
    } else {
        await loadCandidateDashboard();
    }
});

// ── Page switcher (sidebar nav) ───────────────────────────────────
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('[id^="page-"]').forEach(p => {
        p.style.display = 'none';
    });

    // Show selected page
    document.getElementById(`page-${pageId}`).style.display = 'block';

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
    });

    // Lazy load data when switching to applications page
    if (pageId === 'applications') loadApplications();
    if (pageId === 'my-jobs')      loadMyJobs();
    if (pageId === 'my-applications') loadCandidateApplications();
}

// ══════════════════════════════════════════════════════════════════
// RECRUITER DASHBOARD
// ══════════════════════════════════════════════════════════════════

async function loadRecruiterDashboard() {
    try {
        const [jobs, apps] = await Promise.all([
            Jobs.list(),
            Applications.list(),
        ]);
        // Promise.all runs both requests in parallel — faster than sequential

        // Filter to only this recruiter's jobs
        const myJobs = jobs.filter(j => j.posted_by_username === user.username);
        const myApps = apps;

        renderRecruiterStats(myJobs, myApps);
        renderRecentApps(myApps);
        renderScoreBreakdown(myApps);

    } catch (err) {
        console.error('Dashboard load error:', err);
    }
}

function renderRecruiterStats(jobs, apps) {
    const avgScore = apps.length
        ? Math.round(apps.reduce((s, a) => s + a.ai_match_score, 0) / apps.length)
        : 0;

    const interviewed = apps.filter(a => a.status === 'interviewed').length;

    document.getElementById('stats-grid').innerHTML = [
        { label: 'Active Jobs',       value: jobs.length,  icon: '💼', color: 'rgba(79,70,229,.1)'  },
        { label: 'Total Applications',value: apps.length,  icon: '📄', color: 'rgba(16,185,129,.1)' },
        { label: 'Interviews',        value: interviewed,  icon: '🗓', color: 'rgba(245,158,11,.1)' },
        { label: 'Avg AI Score',      value: `${avgScore}%`,icon: '🤖', color: 'rgba(239,68,68,.1)'  },
    ].map(s => `
        <div class="stat-card">
            <div class="stat-icon" style="background:${s.color}">${s.icon}</div>
            <div>
                <div class="stat-value">${s.value}</div>
                <div class="stat-label">${s.label}</div>
            </div>
        </div>
    `).join('');
}

function renderRecentApps(apps) {
    const el = document.getElementById('recent-apps-list');
    if (!apps.length) {
        el.innerHTML = '<p class="text-muted text-sm">No applications yet.</p>';
        return;
    }

    el.innerHTML = apps.slice(0, 5).map(app => `
        <div class="flex justify-between items-center"
             style="padding:10px 0; border-bottom:1px solid var(--border);">
            <div>
                <div style="font-weight:500; font-size:0.875rem;">${app.job_title}</div>
                <div class="text-sm text-muted">${app.candidate_name} · ${formatDate(app.applied_at)}</div>
            </div>
            <div class="flex items-center gap-3">
                ${scoreRingSVG(app.ai_match_score, 44)}
                ${statusBadge(app.status)}
            </div>
        </div>
    `).join('');
}

function renderScoreBreakdown(apps) {
    const el = document.getElementById('score-breakdown');
    const tiers = [
        { label: 'Excellent (80–100%)', count: apps.filter(a => a.ai_match_score >= 80).length,  color: '#10b981' },
        { label: 'Good (60–79%)',       count: apps.filter(a => a.ai_match_score >= 60 && a.ai_match_score < 80).length, color: '#f59e0b' },
        { label: 'Fair (40–59%)',       count: apps.filter(a => a.ai_match_score >= 40 && a.ai_match_score < 60).length, color: '#4f46e5' },
        { label: 'Low (< 40%)',         count: apps.filter(a => a.ai_match_score < 40).length,   color: '#ef4444' },
    ];

    el.innerHTML = tiers.map(t => `
        <div style="margin-bottom:16px;">
            <div class="flex justify-between text-sm mb-2">
                <span>${t.label}</span>
                <span style="font-weight:600;">${t.count}</span>
            </div>
            <div class="progress">
                <div class="progress-bar" style="
                    width:${apps.length ? (t.count / apps.length * 100) : 0}%;
                    background:${t.color};
                "></div>
            </div>
        </div>
    `).join('');
}

// ── Post Job ──────────────────────────────────────────────────────
async function postJob() {
    const btn   = document.getElementById('post-job-btn');
    const alert = document.getElementById('post-job-alert');

    const data = {
        title:        document.getElementById('job-title').value.trim(),
        company:      document.getElementById('job-company').value.trim(),
        location:     document.getElementById('job-location').value.trim(),
        salary:       document.getElementById('job-salary').value.trim(),
        job_type:     document.getElementById('job-type').value,
        category:     document.getElementById('job-category').value,
        description:  document.getElementById('job-description').value.trim(),
        requirements: document.getElementById('job-requirements').value.trim(),
        skills:       document.getElementById('job-skills').value
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean),
        // Split by comma, trim whitespace, remove empty strings
    };

    if (!data.title || !data.company || !data.description) {
        showDashAlert(alert, 'Title, company and description are required.', 'danger');
        return;
    }

    btn.disabled   = true;
    btn.innerHTML  = '<span class="spinner"></span> Posting...';
    hideDashAlert(alert);

    try {
        await Jobs.create(data);
        showDashAlert(alert, '✓ Job posted successfully!', 'success');
        showToast('Job posted!');

        // Clear form
        ['job-title','job-company','job-location','job-salary',
         'job-skills','job-description','job-requirements'].forEach(id => {
            document.getElementById(id).value = '';
        });

    } catch (err) {
        showDashAlert(alert, 'Failed to post job. Please try again.', 'danger');
    } finally {
        btn.disabled  = false;
        btn.innerHTML = 'Post Job';
    }
}

// ── My Jobs ───────────────────────────────────────────────────────
async function loadMyJobs() {
    const el = document.getElementById('my-jobs-list');
    el.innerHTML = '<p class="text-muted">Loading...</p>';

    try {
        const data = await Jobs.list();
        const myJobs = data.results.filter(j => j.posted_by_username === user.username);

        if (!myJobs.length) {
            el.innerHTML = `<div class="empty-state"><div class="empty-icon">💼</div><p>No jobs posted yet.</p></div>`;
            return;
        }

        el.innerHTML = myJobs.map(job => `
            <div class="card">
                <div class="card-body flex justify-between items-start">
                    <div style="flex:1;">
                        <div class="flex items-center gap-2 mb-1">
                            <h4>${job.title}</h4>
                            <span class="badge badge-primary">${job.category}</span>
                        </div>
                        <p class="text-sm text-muted">${job.company} · ${job.location} · ${job.salary}</p>
                        <div class="flex wrap gap-1 mt-2">
                            ${job.skills.map(s => `<span class="chip">${s}</span>`).join('')}
                        </div>
                    </div>
                    <div style="text-align:right; flex-shrink:0;">
                        <div style="font-weight:800; font-size:1.5rem;">${job.application_count ?? 0}</div>
                        <div class="text-sm text-muted">Applications</div>
                        <button class="btn btn-danger btn-sm mt-3"
                            onclick="deleteJob(${job.id})">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        el.innerHTML = '<p class="text-muted">Failed to load jobs.</p>';
    }
}

async function deleteJob(id) {
    if (!confirm('Delete this job? This cannot be undone.')) return;
    try {
        await Jobs.delete(id);
        showToast('Job deleted.');
        loadMyJobs();
    } catch (err) {
        showToast('Failed to delete job.');
    }
}

// ── Applications (Recruiter) ──────────────────────────────────────
async function loadApplications() {
    const tbody = document.getElementById('applications-tbody');

    try {
        const apps = await Applications.list();

        if (!apps.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:2rem;">No applications yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = apps.map(app => `
            <tr>
                <td>
                    <div style="font-weight:500;">${app.candidate_name}</div>
                </td>
                <td>
                    <div>${app.job_title}</div>
                    <div class="text-sm text-muted">${app.job_company}</div>
                </td>
                <td>${scoreRingSVG(app.ai_match_score, 48)}</td>
                <td>
                    <select
                        class="form-control"
                        style="width:150px; padding:0.3rem 0.5rem; font-size:0.8rem;"
                        onchange="updateStatus(${app.id}, this.value)"
                    >
                        ${['under_review','shortlisted','interviewed','offered','rejected'].map(s => `
                            <option value="${s}" ${app.status === s ? 'selected' : ''}>
                                ${s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </option>
                        `).join('')}
                    </select>
                </td>
                <td class="text-sm text-muted">${formatDate(app.applied_at)}</td>
                <td>
                    <button class="btn btn-ghost btn-sm" onclick="viewAppDetail(${app.id})">
                        View
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Failed to load.</td></tr>`;
    }
}

async function updateStatus(appId, newStatus) {
    try {
        await Applications.updateStatus(appId, newStatus);
        showToast('Status updated.');
    } catch (err) {
        showToast('Failed to update status.');
    }
}

async function viewAppDetail(appId) {
    const app = await Applications.get(appId);
    const score = app.ai_match_score;
    const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

    document.getElementById('app-detail-body').innerHTML = `
        <div class="flex items-center gap-4 mb-4">
            ${scoreRingSVG(score, 72)}
            <div>
                <h3>${app.candidate_name}</h3>
                <p class="text-sm text-muted">${app.job_title} · ${app.job_company}</p>
                <p class="text-sm mt-1" style="color:${color}; font-weight:600;">
                    ${score >= 75 ? '🎉 Strong Match' : score >= 50 ? '👍 Decent Fit' : '⚠️ Weak Match'}
                </p>
            </div>
        </div>

        <div class="flex wrap gap-2 mb-4">
            ${app.ai_matched_skills.map(s => `<span class="chip chip-match">✓ ${s}</span>`).join('')}
            ${app.ai_missing_skills.map(s => `<span class="chip chip-miss">✗ ${s}</span>`).join('')}
        </div>

        <div class="ai-box mb-4">
            <p class="text-sm" style="line-height:1.7;">${app.ai_summary}</p>
            <div class="divider"></div>
            <h4 class="mb-2">💪 Strengths</h4>
            <ul style="padding-left:1.2rem; font-size:0.875rem; line-height:2;">
                ${app.ai_strengths.map(s => `<li>${s}</li>`).join('')}
            </ul>
            <div class="divider"></div>
            <h4 class="mb-2">⚠️ Gaps</h4>
            <ul style="padding-left:1.2rem; font-size:0.875rem; line-height:2;">
                ${app.ai_gaps.map(g => `<li>${g}</li>`).join('')}
            </ul>
        </div>

        <h4 class="mb-2">Resume</h4>
        <div style="background:var(--bg); border-radius:8px; padding:1rem;
                    font-size:0.8rem; line-height:1.7; max-height:200px;
                    overflow-y:auto; border:1px solid var(--border);">
            ${app.resume_text}
        </div>
    `;

    document.getElementById('app-detail-modal').style.display = 'flex';
}

function closeAppModal() {
    document.getElementById('app-detail-modal').style.display = 'none';
}

// ══════════════════════════════════════════════════════════════════
// CANDIDATE DASHBOARD
// ══════════════════════════════════════════════════════════════════

async function loadCandidateDashboard() {
    try {
        const apps = await Applications.list();
        renderCandidateStats(apps);
        renderCandidateRecent(apps);
    } catch (err) {
        console.error(err);
    }
}

function renderCandidateStats(apps) {
    const avgScore = apps.length
        ? Math.round(apps.reduce((s, a) => s + a.ai_match_score, 0) / apps.length)
        : 0;
    const best = apps.reduce((a, b) => a.ai_match_score > b.ai_match_score ? a : b, { ai_match_score: 0 });
    const interviews = apps.filter(a => a.status === 'interviewed').length;

    document.getElementById('candidate-stats').innerHTML = [
        { label: 'Applied',       value: apps.length,        icon: '📋', color: 'rgba(79,70,229,.1)'  },
        { label: 'Avg Match',     value: `${avgScore}%`,     icon: '🎯', color: 'rgba(16,185,129,.1)' },
        { label: 'Interviews',    value: interviews,          icon: '🗓', color: 'rgba(245,158,11,.1)' },
        { label: 'Best Match',    value: `${best.ai_match_score}%`, icon: '⭐', color: 'rgba(239,68,68,.1)'  },
    ].map(s => `
        <div class="stat-card">
            <div class="stat-icon" style="background:${s.color}">${s.icon}</div>
            <div>
                <div class="stat-value">${s.value}</div>
                <div class="stat-label">${s.label}</div>
            </div>
        </div>
    `).join('');
}

function renderCandidateRecent(apps) {
    const el = document.getElementById('candidate-recent');
    if (!apps.length) {
        el.innerHTML = `<div class="empty-state"><p>No applications yet. <a href="index.html">Browse jobs →</a></p></div>`;
        return;
    }

    el.innerHTML = apps.map(app => `
        <div class="flex justify-between items-center"
             style="padding:12px 0; border-bottom:1px solid var(--border);">
            <div>
                <div style="font-weight:500;">${app.job_title}</div>
                <div class="text-sm text-muted">${app.job_company} · ${formatDate(app.applied_at)}</div>
            </div>
            <div class="flex items-center gap-3">
                ${scoreRingSVG(app.ai_match_score, 48)}
                ${statusBadge(app.status)}
            </div>
        </div>
    `).join('');
}

async function loadCandidateApplications() {
    const el = document.getElementById('candidate-apps-list');
    el.innerHTML = '<p class="text-muted">Loading...</p>';

    try {
        const apps = await Applications.list();

        if (!apps.length) {
            el.innerHTML = `<div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>No applications yet. <a href="index.html">Browse jobs →</a></p>
            </div>`;
            return;
        }

        el.innerHTML = apps.map(app => `
            <div class="card">
                <div class="card-body">
                    <div class="flex justify-between items-start">
                        <div style="flex:1;">
                            <h4>${app.job_title}</h4>
                            <p class="text-sm text-muted mt-1">${app.job_company}</p>
                            <div class="flex wrap gap-1 mt-3">
                                ${app.ai_matched_skills.map(s => `<span class="chip chip-match">✓ ${s}</span>`).join('')}
                                ${app.ai_missing_skills.map(s => `<span class="chip chip-miss">✗ ${s}</span>`).join('')}
                            </div>
                        </div>
                        <div class="flex flex-col items-center gap-2" style="flex-shrink:0; margin-left:1rem;">
                            ${scoreRingSVG(app.ai_match_score, 64)}
                            ${statusBadge(app.status)}
                        </div>
                    </div>
                    <div class="divider"></div>
                    <p class="text-sm" style="line-height:1.7; color:var(--dark2);">${app.ai_summary}</p>
                </div>
            </div>
        `).join('');

    } catch (err) {
        el.innerHTML = '<p class="text-muted">Failed to load applications.</p>';
    }
}

// ══════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ══════════════════════════════════════════════════════════════════

function scoreRingSVG(score, size = 60) {
    const stroke = size * 0.1;
    const r      = (size - stroke) / 2;
    const circ   = 2 * Math.PI * r;
    const dash   = (score / 100) * circ;
    const color  = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
    const fs     = size * 0.2;

    return `
        <div class="score-ring" style="width:${size}px; height:${size}px;">
            <svg width="${size}" height="${size}">
                <circle cx="${size/2}" cy="${size/2}" r="${r}"
                    fill="none" stroke="#e2e8f0" stroke-width="${stroke}"/>
                <circle cx="${size/2}" cy="${size/2}" r="${r}"
                    fill="none" stroke="${color}" stroke-width="${stroke}"
                    stroke-dasharray="${dash} ${circ}" stroke-linecap="round"
                    style="transform:rotate(-90deg); transform-origin:center;"/>
            </svg>
            <div class="score-text" style="color:${color}; font-size:${fs}px;">${score}%</div>
        </div>`;
}

function statusBadge(status) {
    const map = {
        under_review: 'warning',
        shortlisted:  'primary',
        interviewed:  'primary',
        offered:      'success',
        rejected:     'danger',
    };
    const label = status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `<span class="badge badge-${map[status] || 'gray'}">${label}</span>`;
}

function showToast(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showDashAlert(el, msg, type) {
    el.textContent = msg;
    el.className   = `alert alert-${type} show`;
}

function hideDashAlert(el) { el.classList.remove('show'); }

function formatDate(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return `${diff} days ago`;
}