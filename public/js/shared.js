async function loadPartial(url, elementId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load ${url}`);
        const html = await response.text();
        const container = document.getElementById(elementId);
        if (container) {
            container.innerHTML = html;
        } else {
            console.error(`Container element with ID '${elementId}' not found for partial ${url}`);
        }

        if (elementId === 'sidebar-container' || elementId === 'sidebar-placeholder') {
        }
    } catch (error) {
        console.error(`Error loading partial ${url}:`, error);
    }
}

function initSidebar() {
    const openSidebarBtn = document.getElementById('openSidebarBtn');
    if (openSidebarBtn) {
        openSidebarBtn.addEventListener('click', () => {
            const sidebar = document.querySelector('.citizen-sidebar') || document.querySelector('.admin-sidebar');
            if (sidebar) {
                sidebar.classList.toggle('open');
            }
        });
    }

    const logoutButtons = document.querySelectorAll('.logout-btn');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = '/admin/login.html';
        });
    });
}

function requireAuth(role = null) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = role === 'admin' ? '/admin/login.html' : '/citizen/login.html';
        return false;
    }
    return true;
}

function loadHeader() {
    loadPartial('/partials/header.html', 'header-placeholder');
}

function loadSidebar() {
    const isAdminPage = window.location.pathname.includes('/admin/');
    const sidebarPartial = isAdminPage ? '/partials/admin-sidebar.html' : '/partials/citizen-sidebar.html';
    loadPartial(sidebarPartial, isAdminPage ? 'sidebar-container' : 'sidebar-placeholder');
    initSidebar();
}

function loadFooter() {
    loadPartial('/partials/footer.html', 'footer-placeholder');
}

function initTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(el => {
        el.addEventListener('mouseenter', showTooltip);
        el.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(e) {
    const tooltipText = this.getAttribute('data-tooltip');
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = tooltipText;
    document.body.appendChild(tooltip);

    const rect = this.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width/2 - tooltip.offsetWidth/2}px`;
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
}

function hideTooltip() {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) tooltip.remove();
}

export { loadPartial, requireAuth, loadHeader, loadSidebar, loadFooter, initTooltips };
