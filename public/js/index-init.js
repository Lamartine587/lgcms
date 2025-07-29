// public/js/index-init.js

// Import necessary functions from shared.js
import { loadHeader, loadFooter } from './shared.js';

document.addEventListener('DOMContentLoaded', () => {
    // Load common components for the home page
    loadHeader(); // Loads header.html into header-placeholder
    loadFooter(); // Loads footer.html into footer-placeholder
});
