// Load partial templates
async function loadPartial(url, elementId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load ${url}`);
        const html = await response.text();
        document.getElementById(elementId).innerHTML = html;
        
        // Initialize any components in the partial
        if (elementId === 'sidebar-container' || elementId === 'sidebar-placeholder') {
            initSidebar();
        }
    } catch (error) {
        console.error(`Error loading partial ${url}:`, error);
    }
}

// Initialize sidebar functionality
function initSidebar() {
    // Mobile toggle button
    const openSidebarBtn = document.getElementById('openSidebarBtn');
    if (openSidebarBtn) {
        openSidebarBtn.addEventListener('click', () => {
            document.querySelector('.citizen-sidebar').classList.toggle('open');
        });
    }

    // Logout functionality
    const logoutButtons = document.querySelectorAll('.logout-btn');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = '/';
        });
    });
}

// Check authentication
function requireAuth(role = null) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = role === 'admin' ? '/admin/login' : '/citizen/login';
        return false;
    }
    return true;
}

// Load common components
function loadHeader() {
    loadPartial('/partials/header.html', 'header-container');
}

function loadSidebar() {
    const isAdminPage = window.location.pathname.includes('/admin/');
    const sidebarPartial = isAdminPage ? '/partials/admin-sidebar.html' : '/partials/citizen-sidebar.html';
    loadPartial(sidebarPartial, isAdminPage ? 'sidebar-container' : 'sidebar-placeholder');
}

function loadFooter() {
    loadPartial('/partials/footer.html', 'footer-container');
}

// Initialize tooltips
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

// Initialize all common functionality
function initApp() {
    if (document.getElementById('header-container')) loadHeader();
    if (document.getElementById('sidebar-container') || document.getElementById('sidebar-placeholder')) loadSidebar();
    if (document.getElementById('footer-container')) loadFooter();
    initTooltips();
}

document.addEventListener('DOMContentLoaded', initApp);

export { loadPartial, requireAuth, loadHeader, loadSidebar, loadFooter };