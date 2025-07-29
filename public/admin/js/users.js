// public/js/manage-users-init.js

// Import necessary functions from shared.js and admin.js
import { loadHeader, loadSidebar, loadFooter, initTooltips } from './shared.js';
import { loadUsers } from './admin.js';

// This script initializes the Manage Users page
document.addEventListener('DOMContentLoaded', () => {
    // Load common components
    loadHeader();
    loadSidebar();
    loadFooter();
    initTooltips(); // Initialize tooltips for this page

    // Load users for the table when the page is ready
    loadUsers();

    // Add event listeners for pagination buttons
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            // Assuming loadUsers handles current page state internally or takes a page number
            // You might need to add state management for current page in loadUsers or a wrapper
            console.log('Previous page button clicked.');
            // Example: loadUsers(currentPage - 1);
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            console.log('Next page button clicked.');
            // Example: loadUsers(currentPage + 1);
        });
    }

    // Add event listener for the Add New User button (if applicable)
    const addUsersBtn = document.getElementById('add-user-btn');
    if (addUsersBtn) {
        addUsersBtn.addEventListener('click', () => {
            console.log('Add New User button clicked.');
            // Implement logic to open a modal or redirect to an add user form
        });
    }

    // Add event listener for user search (if applicable)
    const userSearchInput = document.getElementById('user-search');
    if (userSearchInput) {
        userSearchInput.addEventListener('input', () => {
            console.log('User search input changed:', userSearchInput.value);
            // Implement search logic, e.g., debounce and call loadUsers with a search query
            // Example: loadUsers(1, userSearchInput.value);
        });
    }
});
