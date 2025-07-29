// public/js/settings-init.js

// Import necessary functions from shared.js and admin.js
import { loadHeader, loadSidebar, loadFooter } from './shared.js';
// Assuming initSettingsTabs will be defined in this file or imported from admin.js
// For now, defining a placeholder for initSettingsTabs here.
// If initSettingsTabs is in admin.js, you would import it:
// import { initSettingsTabs } from './admin.js';

function initSettingsTabs() {
    console.log('Initializing settings tabs...');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const targetContent = document.getElementById(tabId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });

    // Optionally trigger a click on the first tab to show content on load
    if (tabButtons.length > 0) {
        tabButtons[0].click();
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // Load common components
    loadHeader();
    loadSidebar();
    loadFooter();

    // Initialize settings tabs functionality
    initSettingsTabs();

    // Example: Handle form submission for general settings
    const generalSettingsForm = document.getElementById('general-settings');
    if (generalSettingsForm) {
        generalSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Saving general settings...');
            const formData = new FormData(generalSettingsForm);
            const data = Object.fromEntries(formData.entries());

            // Example API call to save settings
            // try {
            //     const response = await fetch('/api/admin/settings/general', {
            //         method: 'POST',
            //         headers: { 'Content-Type': 'application/json' },
            //         body: JSON.stringify(data)
            //     });
            //     if (response.ok) {
            //         alert('Settings saved successfully!');
            //     } else {
            //         alert('Failed to save settings.');
            //     }
            // } catch (error) {
            //     console.error('Error saving settings:', error);
            //     alert('An error occurred while saving settings.');
            // }
        });
    }
});
