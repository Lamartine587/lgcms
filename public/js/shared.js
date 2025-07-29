// Load partial templates
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
        
        // Initialize any components in the partial
        if (elementId === 'sidebar-container' || elementId === 'sidebar-placeholder') {
            initSidebar(); // Call initSidebar after sidebar is loaded
        }
    } catch (error) {
        console.error(`Error loading partial ${url}:`, error);
    }
}

// Secure Logout Function
async function logoutUser() {
    console.log('Attempting to log out...');
    const token = localStorage.getItem('token');

    // Optional: Call a backend endpoint to invalidate the token on the server
    if (token) {
        try {
            // Assuming you have a backend route like /api/admin/logout
            const response = await fetch('/api/admin/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                console.log('Token successfully invalidated on server.');
            } else {
                console.error('Failed to invalidate token on server:', await response.text());
            }
        } catch (error) {
            console.error('Error during server-side logout:', error);
        }
    }

    // Client-side token removal (always perform this)
    localStorage.removeItem('token');
    console.log('Client-side token removed. Redirecting...');

    // Redirect to the admin login page
    window.location.href = '/admin/login.html';
}


// Initialize sidebar functionality
function initSidebar() {
    // Mobile toggle button
    const openSidebarBtn = document.getElementById('openSidebarBtn');
    if (openSidebarBtn) {
        openSidebarBtn.addEventListener('click', () => {
            // Check if it's an admin or citizen sidebar based on context
            const sidebar = document.querySelector('.citizen-sidebar') || document.querySelector('.admin-sidebar');
            if (sidebar) {
                sidebar.classList.toggle('open');
            }
        });
    }

    // Logout functionality - now calls the secure logoutUser function
    const logoutButtons = document.querySelectorAll('.sidebar-logout-btn'); // Use the class on the button
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser(); // Call the new secure logout function
        });
    });
}

// Check authentication
function requireAuth(role = null) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = role === 'admin' ? '/admin/login.html' : '/citizen/login.html'; // Ensure .html extension
        return false;
    }
    return true;
}

// Load common components
function loadHeader() {
    loadPartial('/partials/header.html', 'header-placeholder'); // Corrected ID for citizen pages
}

function loadSidebar() {
    const isAdminPage = window.location.pathname.includes('/admin/');
    const sidebarPartial = isAdminPage ? '/partials/admin-sidebar.html' : '/partials/citizen-sidebar.html';
    loadPartial(sidebarPartial, isAdminPage ? 'sidebar-container' : 'sidebar-placeholder');
    // initSidebar is called inside loadPartial's callback for sidebar-container/placeholder
}

function loadFooter() {
    loadPartial('/partials/footer.html', 'footer-placeholder'); // Corrected ID for citizen pages
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

// Initialize all common functionality (this is now primarily for pages that don't have a specific init script)
function initApp() {
    // These checks are for pages that don't have a dedicated init script
    // Pages with dedicated init scripts (like submit-complaint-init.js) will call these functions directly.
    if (document.getElementById('header-placeholder') || document.getElementById('header-container')) loadHeader();
    if (document.getElementById('sidebar-placeholder') || document.getElementById('sidebar-container')) loadSidebar();
    if (document.getElementById('footer-placeholder') || document.getElementById('footer-container')) loadFooter();
    initTooltips();
}

document.addEventListener('DOMContentLoaded', initApp);

// Export functions, including the new logoutUser function
export { loadPartial, requireAuth, loadHeader, loadSidebar, loadFooter, initTooltips, logoutUser };
