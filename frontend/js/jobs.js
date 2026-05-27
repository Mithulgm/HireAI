// js/jobs.js
// Handles the job board page (index.html)

let allJobs       = [];
let currentPage   = 1;       // ← add
let totalPages    = 1;       // ← add
let selectedJobId = null;
let applyingToJobId = null;
// ── On page load ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    setupNavbar();
    await loadJobs(1);

    // ← Add this so pressing Enter triggers search
    document.getElementById('search-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') loadJobs(1);
    });
});

// ── Navbar: show/hide links based on login state ──────────────────
function setupNavbar() {
    const user = getUser();
    if (user) {
        document.getElementById('nav-login-link').style.display    = 'none';
        document.getElementById('nav-logout-link').style.display   = 'list-item';
        document.getElementById('nav-dashboard-link').style.display = 'list-item';

        const dashLink = document.getElementById('nav-dashboard');
        dashLink.href = user.role === 'recruiter'
            ? '/frontend/recruiter.html'
            : '/frontend/candidate.html';

        document.getElementById('nav-logout').addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }
}

// ── Load jobs from Django API ─────────────────────────────────────

async function loadJobs(page = 1) {
    currentPage = page;

    // Read current filter values from the DOM
    const search   = document.getElementById('search-input').value.trim();
    const category = document.getElementById('filter-category').value;
    const job_type = document.getElementById('filter-type').value;

    // Build filters — only send non-empty values
    const filters = { page };
    if (search)   filters.search   = search;
    if (category) filters.category = category;
    if (job_type) filters.job_type = job_type;

    try {
        const data = await Jobs.list(filters);
        // data is now { count, total_pages, current_page, next, previous, results }

        allJobs    = data.results;   // ← jobs are inside .results now
        totalPages = data.total_pages;

        document.getElementById('job-count').textContent =
            `${data.count} jobs found`;

        renderJobs(allJobs);
        renderPagination(data);      // ← new: draw page buttons

    } catch (err) {
        document.getElementById('job-list').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❌</div>
                <p>Could not load jobs. Make sure Django is running.</p>
            </div>`;
    }
}
// ── Filter jobs by search + dropdowns ────────────────────────────
// AFTER — tells Django to filter, always goes back to page 1
function filterJobs() {
    loadJobs(1);
    // loadJobs() reads the search/filter values itself
    // and sends them to Django as query params
    // Django filters, Django paginates, sends back results
}

 function renderPagination(data) {
    // Remove existing pagination if it's there
    const existing = document.getElementById('pagination');
    if (existing) existing.remove();

    // Don't show pagination if there's only 1 page
    if (data.total_pages <= 1) return;

    const nav = document.createElement('div');
    nav.id = 'pagination';
    nav.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        margin-top: 24px;
    `;

    // ← Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn btn-ghost btn-sm';
    prevBtn.textContent = '← Prev';
    prevBtn.disabled = !data.previous;
    // disabled if there's no previous page (we're on page 1)
    prevBtn.onclick = () => loadJobs(data.current_page - 1);
    nav.appendChild(prevBtn);

    // Page number buttons
    for (let i = 1; i <= data.total_pages; i++) {
        const btn = document.createElement('button');
        btn.className = `btn btn-sm ${i === data.current_page ? 'btn-primary' : 'btn-ghost'}`;
        // Current page gets btn-primary (filled), others get btn-ghost (outline)
        btn.textContent = i;
        btn.onclick = () => loadJobs(i);
        nav.appendChild(btn);
    }

    // Next → button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-ghost btn-sm';
    nextBtn.textContent = 'Next →';
    nextBtn.disabled = !data.next;
    // disabled if there's no next page (we're on the last page)
    nextBtn.onclick = () => loadJobs(data.current_page + 1);
    nav.appendChild(nextBtn);

    // Insert pagination below the job list
    document.getElementById('job-list').after(nav);
}

// ── Render job cards ──────────────────────────────────────────────
function renderJobs(jobs) {
    const list = document.getElementById('job-list');
    document.getElementById('job-count').textContent = `${jobs.length} jobs found`;

    if (jobs.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <p>No jobs match your search.</p>
            </div>`;
        return;
    }

    list.innerHTML = jobs.map(job => `
        <div
            class="job-card ${selectedJobId === job.id ? 'active' : ''}"
            onclick="selectJob(${job.id})"
        >
            <div class="flex justify-between items-center">
                <div>
                    <h4>${job.title}</h4>
                    <p class="text-sm text-muted mt-1">
                        ${job.company} · ${job.location}
                    </p>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700; color:var(--primary); font-size:0.9rem;">
                        ${job.salary || 'Salary TBD'}
                    </div>
                    <div class="text-sm text-muted">${formatDate(job.created_at)}</div>
                </div>
            </div>

            <div class="flex wrap gap-1 mt-3">
                ${job.skills.slice(0, 4).map(s =>
                    `<span class="chip">${s}</span>`
                ).join('')}
                ${job.skills.length > 4
                    ? `<span class="badge badge-gray">+${job.skills.length - 4}</span>`
                    : ''}
            </div>

            // AFTER — adds applicant count on the right
            <div class="flex justify-between items-center mt-3">
                 <div class="flex gap-2">
                    <span class="badge badge-primary">${formatJobType(job.job_type)}</span>
                    <span class="badge badge-gray">${formatCategory(job.category)}</span>
                </div>
                <span class="text-sm text-muted">
                    ${job.application_count} applicant${job.application_count !== 1 ? 's' : ''}
                </span>
            </div>
    `).join('');
}

// ── Show job detail panel ─────────────────────────────────────────
async function selectJob(id) {
    selectedJobId = id;
    renderJobs(allJobs.filter(j => {
        const query    = document.getElementById('search-input').value.toLowerCase();
        const category = document.getElementById('filter-category').value;
        const type     = document.getElementById('filter-type').value;
        return (!query || j.title.toLowerCase().includes(query) || j.company.toLowerCase().includes(query)) &&
               (!category || j.category === category) &&
               (!type || j.job_type === type);
    }));
    // Re-render to show active state on selected card

    const job = allJobs.find(j => j.id === id);
    if (!job) return;

    const user = getUser();
    const detail = document.getElementById('job-detail');
    detail.style.display = 'block';

    detail.innerHTML = `
        <div class="card">
            <div class="card-body">
                <div class="flex justify-between items-start mb-2">
                    <h3>${job.title}</h3>
                    <button class="btn btn-ghost btn-sm" onclick="closeDetail()">✕</button>
                </div>

                <p class="text-sm text-muted">${job.company} · ${job.location}</p>

                <div class="flex wrap gap-2 mt-3">
                    <span class="badge badge-primary">${formatJobType(job.job_type)}</span>
                    <span class="badge badge-gray">${formatCategory(job.category)}</span>
                    ${job.salary ? `<span class="badge badge-success">${job.salary}</span>` : ''}
                </div>

                <div class="divider"></div>

                <p class="text-sm" style="line-height:1.7;">${job.description}</p>

                <p class="text-sm text-muted mt-3">
                    <strong>Requirements:</strong> ${job.requirements}
                </p>

                <div class="divider"></div>

                <h4 class="mb-2">Required Skills</h4>
                <div class="flex wrap gap-2 mb-4">
                    ${job.skills.map(s => `<span class="chip">${s}</span>`).join('')}
                </div>

                ${user && user.role === 'candidate'
                    ? `<button class="btn btn-primary btn-full btn-lg" onclick="openApplyModal(${job.id}, '${job.title}')">
                           🤖 Apply with AI Analysis
                       </button>`
                    : user && user.role === 'recruiter'
                    ? `<p class="text-center text-muted text-sm">
                           Switch to a candidate account to apply.
                       </p>`
                    : `<a href="login.html" class="btn btn-primary btn-full btn-lg">
                           Login to Apply
                       </a>`
                }
            </div>
        </div>
    `;
}

function closeDetail() {
    selectedJobId = null;
    document.getElementById('job-detail').style.display = 'none';
}

// ── Apply modal ───────────────────────────────────────────────────
function openApplyModal(jobId, jobTitle) {
    applyingToJobId = jobId;
    document.getElementById('apply-modal-title').textContent = `Apply: ${jobTitle}`;
    document.getElementById('apply-step-1').style.display = 'block';
    document.getElementById('apply-step-2').style.display = 'none';
    document.getElementById('resume-input').value = '';
    document.getElementById('cover-input').value  = '';
    document.getElementById('apply-modal').style.display = 'flex';
}

function closeApplyModal() {
    document.getElementById('apply-modal').style.display = 'none';
    applyingToJobId = null;
}

async function submitApplication() {
    const resume = document.getElementById('resume-input').value.trim();
    const cover  = document.getElementById('cover-input').value.trim();
    const alert  = document.getElementById('apply-alert');
    const btn    = document.getElementById('apply-btn');

    if (!resume) {
        showJobAlert(alert, 'Please paste your resume.', 'danger');
        return;
    }

    btn.disabled    = true;
    btn.innerHTML   = '<span class="spinner"></span> AI is analyzing your resume...';
    hideJobAlert(alert);

    try {
        const result = await Applications.apply(applyingToJobId, resume, cover);
        // result = full application object with AI scores

        showAIResult(result);
        showToast('✓ Application submitted successfully!');

    } catch (err) {
        const msg = err.data?.error || 'Failed to submit. Please try again.';
        showJobAlert(alert, msg, 'danger');
        btn.disabled  = false;
        btn.innerHTML = '🤖 Analyze & Apply';
    }
}

// ── Show AI analysis result ───────────────────────────────────────
function showAIResult(app) {
    document.getElementById('apply-step-1').style.display = 'none';
    document.getElementById('apply-step-2').style.display = 'block';

    const score = app.ai_match_score;
    const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

    // Score ring (SVG)
    const size = 80, stroke = 7, r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (score / 100) * circ;

    document.getElementById('result-ring').innerHTML = `
        <div class="score-ring" style="width:${size}px; height:${size}px;">
            <svg width="${size}" height="${size}">
                <circle cx="${size/2}" cy="${size/2}" r="${r}"
                    fill="none" stroke="#e2e8f0" stroke-width="${stroke}"/>
                <circle cx="${size/2}" cy="${size/2}" r="${r}"
                    fill="none" stroke="${color}" stroke-width="${stroke}"
                    stroke-dasharray="${dash} ${circ}"
                    stroke-linecap="round"
                    style="transform:rotate(-90deg); transform-origin:center;"/>
            </svg>
            <div class="score-text" style="color:${color}; font-size:1rem;">
                ${score}%
            </div>
        </div>`;

    document.getElementById('result-verdict').textContent =
        score >= 75 ? '🎉 Strong Match!'
        : score >= 50 ? '👍 Decent Fit'
        : '⚠️ Below Average Match';

    document.getElementById('result-summary').textContent = app.ai_summary;

    // Skills
    document.getElementById('result-skills').innerHTML =
        app.ai_matched_skills.map(s => `<span class="chip chip-match">✓ ${s}</span>`).join('') +
        app.ai_missing_skills.map(s => `<span class="chip chip-miss">✗ ${s}</span>`).join('');

    // Strengths
    document.getElementById('result-strengths').innerHTML =
        app.ai_strengths.map(s => `<li>${s}</li>`).join('') || '<li>None identified</li>';

    // Gaps
    document.getElementById('result-gaps').innerHTML =
        app.ai_gaps.map(g => `<li>${g}</li>`).join('') || '<li>No major gaps</li>';
}

// ── Toast notification ────────────────────────────────────────────
function showToast(msg) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ── Alert helpers ─────────────────────────────────────────────────
function showJobAlert(el, msg, type) {
    el.textContent = msg;
    el.className   = `alert alert-${type} show`;
}

function hideJobAlert(el) { el.classList.remove('show'); }

// ── Format helpers ────────────────────────────────────────────────
function formatJobType(type) {
    const map = {
        full_time: 'Full Time', part_time: 'Part Time',
        contract: 'Contract',   internship: 'Internship'
    };
    return map[type] || type;
}

function formatCategory(cat) {
    const map = {
        engineering: 'Engineering', design: 'Design',
        marketing: 'Marketing',     ai_ml: 'AI/ML',
        product: 'Product',         data: 'Data', other: 'Other'
    };
    return map[cat] || cat;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const diff = Math.floor((Date.now() - date) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return `${diff} days ago`;
}