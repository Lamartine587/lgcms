// public/js/manage-complaints-init.js

// Import necessary functions from shared.js and admin.js
import { loadHeader, loadSidebar, loadFooter, initTooltips } from '/js/shared.js';
import { loadComplaints } from '/admin/js/admin.js'; // Import loadComplaints from admin.js

document.addEventListener('DOMContentLoaded', () => {
    // Load common components
    loadHeader();
    loadSidebar();
    loadFooter();
    initTooltips(); // Initialize tooltips for this page

    // Initial load of complaints data for the table
    let currentPage = 1; // Keep track of the current page

    const statusFilterElement = document.getElementById('status-filter');
    const priorityFilterElement = document.getElementById('priority-filter');
    const searchInput = document.getElementById('search-complaints');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const clearFiltersBtn = document.getElementById('clear-filters');

    const fetchAndRenderComplaints = (page) => {
        const status = statusFilterElement ? statusFilterElement.value : 'all';
        const priority = priorityFilterElement ? priorityFilterElement.value : 'all';
        const searchTerm = searchInput ? searchInput.value : ''; // You'll need to update loadComplaints in admin.js to handle this
        
        // For now, loadComplaints only takes page, status, priority.
        // If you want search functionality, you'll need to modify loadComplaints in admin.js
        // and your backend API to handle the 'searchTerm'.
        loadComplaints(page, status, priority);
        currentPage = page;
    };

    fetchAndRenderComplaints(currentPage); // Initial load

    // Event listeners for filters
    if (statusFilterElement) {
        statusFilterElement.addEventListener('change', () => fetchAndRenderComplaints(1));
    }
    if (priorityFilterElement) {
        priorityFilterElement.addEventListener('change', () => fetchAndRenderComplaints(1));
    }
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => fetchAndRenderComplaints(1));
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (statusFilterElement) statusFilterElement.value = 'all';
            if (priorityFilterElement) priorityFilterElement.value = 'all';
            if (searchInput) searchInput.value = '';
            fetchAndRenderComplaints(1); // Re-fetch with cleared filters
        });
    }
    // Optional: Live search on input (consider debouncing for performance)
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            // Debounce this in a real app to avoid too many requests
            // setTimeout(() => fetchAndRenderComplaints(1), 300);
        });
    }

    // Pagination buttons are handled by loadComplaints in admin.js,
    // but the event listeners for prev/next page buttons need to be attached here
    // as they are part of this page's DOM.
    // The loadComplaints function in admin.js will re-render the pagination controls,
    // so these listeners need to be added *after* the pagination is rendered.
    // A better approach would be to have loadComplaints return the pagination HTML
    // or have a separate function to manage pagination buttons.
    // For simplicity, I've added the listeners directly in loadComplaints in admin.js.
    // If you encounter issues, consider restructuring how pagination buttons are handled.
});
