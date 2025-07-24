// Shared constants
const API_BASE_URL = '/api';
const TOKEN_KEY = 'lgcms_token';
const USER_ROLE_KEY = 'lgcms_role';
const USER_NAME_KEY = 'lgcms_username';

// Shared DOM elements
const loadingSpinner = `
    <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i> Loading...
    </div>
`;

// Utility functions
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getUserRole() {
    return localStorage.getItem(USER_ROLE_KEY);
}

function getUserName() {
    return localStorage.getItem(USER_NAME_KEY);
}

function isAuthenticated() {
    return !!getToken();
}

function redirectIfUnauthenticated() {
    const publicPages = ['/index.html', '/login.html', '/register.html'];
    if (!isAuthenticated() && !publicPages.includes(window.location.pathname)) {
        window.location.href = '/index.html';
    }
}

function redirectIfAuthenticated() {
    if (isAuthenticated()) {
        const role = getUserRole();
        window.location.href = role === 'citizen' ? '/my-complaints.html' : '/admin-dashboard.html';
    }
}

function updateNavVisibility() {
    const token = getToken();
    const role = getUserRole();
    
    // Show/hide auth-specific elements
    document.querySelectorAll('.auth-required').forEach(el => {
        el.style.display = token ? '' : 'none';
    });
    
    document.querySelectorAll('.guest-only').forEach(el => {
        el.style.display = token ? 'none' : '';
    });
    
    document.querySelectorAll('.citizen-only').forEach(el => {
        el.style.display = (token && role === 'citizen') ? '' : 'none';
    });
    
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = (token && (role === 'sub-county_admin' || role === 'county_director')) ? '' : 'none';
    });
    
    document.querySelectorAll('.auth-only').forEach(el => {
        el.style.display = token ? '' : 'none';
    });
}

async function apiCall(endpoint, method = 'GET', body = null, isFormData = false) {
    const headers = {};
    const token = getToken();
    
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const options = {
        method,
        headers,
        credentials: 'same-origin'
    };

    if (body) {
        if (isFormData) {
            options.body = body;
        } else {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Request failed');
        }
        
        return response.status !== 204 ? await response.json() : null;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function displayMessage(element, message, isError = false) {
    if (!element) return;
    
    element.textContent = message;
    element.style.color = isError ? 'var(--danger-color)' : 'var(--success-color)';
    element.style.display = 'block';
    
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem(USER_NAME_KEY);
    window.location.href = '/index.html';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Load navigation
    fetch('/partials/navigation.html')
        .then(response => response.text())
        .then(html => {
            const navElement = document.getElementById('navigation');
            if (navElement) navElement.innerHTML = html;
            
            // Add logout event listener
            const logoutBtn = document.getElementById('nav-logout');
            if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
            
            updateNavVisibility();
        });
    
    // Check authentication state
    if (window.location.pathname === '/login.html' || window.location.pathname === '/register.html') {
        redirectIfAuthenticated();
    } else {
        redirectIfUnauthenticated();
    }
});