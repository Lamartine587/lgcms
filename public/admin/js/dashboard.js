// public/js/dashboard-init.js

// Import necessary functions. loadSidebar is from shared.js, not admin.js.
import { loadHeader, loadFooter, initTooltips, loadSidebar } from './shared.js';
import { fetchDashboardStats } from './admin.js'; // fetchDashboardStats is from admin.js


document.addEventListener('DOMContentLoaded', () => {
    // Load common components
    loadHeader();
    loadSidebar(); // Now correctly imported from shared.js
    loadFooter();
    initTooltips();

    // Function to fetch dashboard statistics
    fetchDashboardStats();

    // Add event listeners for quick action buttons
    const addUsersBtn = document.querySelector('.quick-actions-grid .btn-primary:nth-of-type(1)');
    if (addUsersBtn) {
        addUsersBtn.addEventListener('click', () => {
            window.location.href = '/admin/manage-users.html'; // Or '/admin/users' if you have a route
        });
    }

    const viewComplaintsBtn = document.querySelector('.quick-actions-grid .btn-secondary');
    if (viewComplaintsBtn) {
        viewComplaintsBtn.addEventListener('click', () => {
            window.location.href = '/admin/manage-complaints.html'; // Or '/admin/complaints'
        });
    }

    const generateReportBtn = document.querySelector('.quick-actions-grid .btn-outline');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', () => {
            window.location.href = '/admin/reports.html'; // Or '/admin/reports'
        });
    }

    const systemSettingsBtn = document.querySelector('.quick-actions-grid .btn-primary:nth-of-type(2)');
    if (systemSettingsBtn) {
        systemSettingsBtn.addEventListener('click', () => {
            window.location.href = '/admin/settings.html'; // Or '/admin/settings'
        });
    }
});
