// Constants
const TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

// Profile Form Handling
document.addEventListener('DOMContentLoaded', async () => {
    // Load profile data when page loads
    await loadProfileData();
    
    // Handle form submission
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }
});

/**
 * Load existing profile data from server
 */
async function loadProfileData() {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            // Redirect to login if no token found
            window.location.href = '/login.html';
            return;
        }

        const data = await apiCall('/profile', 'GET', null, token);
        
        // Populate form fields
        if (data) {
            populateFormFields(data);
            // Store user data in localStorage for quick access
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(data));
        }
    } catch (error) {
        console.error('Failed to load profile data:', error);
        // Display error to user if needed
        const errorElement = document.getElementById('profile-error');
        displayMessage(errorElement, 'Failed to load profile data. Please try again.', true);
    }
}

/**
 * Populate form fields with user data
 * @param {Object} userData - User profile data
 */
function populateFormFields(userData) {
    const fields = [
        { id: 'profile-fullname', value: userData.full_name },
        { id: 'profile-username', value: userData.username },
        { id: 'profile-email', value: userData.email },
        { id: 'profile-phone', value: userData.phone },
        { id: 'profile-gender', value: userData.gender },
        { id: 'profile-dob', value: formatDateForInput(userData.dob) },
        { id: 'profile-nationality', value: userData.nationality },
        { id: 'profile-idnumber', value: userData.id_number },
        { id: 'profile-occupation', value: userData.occupation },
        { id: 'profile-county', value: userData.county },
        { id: 'profile-department', value: userData.department },
        { id: 'profile-office', value: userData.office }
    ];

    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element && field.value) {
            element.value = field.value;
        }
    });
}

/**
 * Format date for HTML date input
 * @param {string} dateString - Date string from server
 * @returns {string} Formatted date (YYYY-MM-DD)
 */
function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

/**
 * Handle profile form submission
 * @param {Event} e - Form submit event
 */
async function handleProfileSubmit(e) {
    e.preventDefault();
    
    const formData = {
        full_name: document.getElementById('profile-fullname').value.trim(),
        username: document.getElementById('profile-username').value.trim(),
        email: document.getElementById('profile-email').value.trim(),
        phone: document.getElementById('profile-phone').value.trim(),
        gender: document.getElementById('profile-gender').value,
        dob: document.getElementById('profile-dob').value,
        nationality: document.getElementById('profile-nationality').value.trim(),
        id_number: document.getElementById('profile-idnumber').value.trim(),
        occupation: document.getElementById('profile-occupation').value.trim(),
        county: document.getElementById('profile-county').value.trim(),
        department: document.getElementById('profile-department').value.trim(),
        office: document.getElementById('profile-office').value.trim()
    };
    
    const errorElement = document.getElementById('profile-error');
    
    // Basic client-side validation
    if (!formData.email || !formData.full_name) {
        displayMessage(errorElement, 'Email and full name are required', true);
        return;
    }

    try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        const data = await apiCall('/profile/update', 'PUT', formData, token);
        
        displayMessage(errorElement, 'Profile updated successfully!', false);
        
        // Update localStorage with new data
        const userData = JSON.parse(localStorage.getItem(USER_DATA_KEY) || {});
        if (!userData) {
            throw new Error('No user data found in localStorage');
        }
        localStorage.setItem(USER_DATA_KEY, JSON.stringify({ ...userData, ...formData }));
        
        // Optional: Update UI or redirect after delay
        setTimeout(() => {
            // window.location.href = '/dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Profile update error:', error);
        displayMessage(errorElement, error.message || 'Failed to update profile. Please try again.', true);
    }
}

/**
 * Make API calls
 * @param {string} url - API endpoint
 * @param {string} method - HTTP method
 * @param {Object} body - Request body
 * @param {string} token - Auth token
 * @returns {Promise} - Resolves with response data
 */
async function apiCall(url, method = 'GET', body = null, token = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    };

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
}

/**
 * Display messages to user
 * @param {HTMLElement} element - Element to display message in
 * @param {string} message - Message text
 * @param {boolean} isError - Whether it's an error message
 */
function displayMessage(element, message, isError) {
    if (!element) return;
    
    element.textContent = message;
    element.classList.toggle('hidden', false);
    element.classList.toggle('text-red-500', isError);
    element.classList.toggle('text-green-500', !isError);

    // Auto-hide after 5 seconds
    setTimeout(() => {
        element.classList.add('hidden');
    }, 5000);
}