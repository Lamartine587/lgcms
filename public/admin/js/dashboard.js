// public/js/dashboard-init.js

// Import necessary functions.
import { loadHeader, loadFooter, initTooltips, loadSidebar } from './shared.js';
// Corrected: Import loadReports and ensure absolute path for admin.js
import { fetchDashboardStats, loadReports } from '/admin/js/admin.js'; 

document.addEventListener('DOMContentLoaded', () => {
    // Load common components
    loadHeader();
    loadSidebar(); 
    loadFooter();
    initTooltips();

    // Function to fetch dashboard statistics
    fetchDashboardStats();
    
    // IMPORTANT: Load ML-generated reports and predictions for the dashboard
    loadReports(); // This call was missing and is crucial for charts

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
