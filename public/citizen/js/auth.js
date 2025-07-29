// public/js/auth.js

/**
 * Handles citizen user registration by sending data to the backend API.
 * @param {Object} formData - The registration data (fullName, username, email, password).
 * @returns {Promise<Object>} - A promise that resolves with the API response data.
 */
export async function registerCitizen(formData) {
    try {
        // Corrected: API path to /api/users/register
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        return data;
    } catch (error) {
        console.error('Error during citizen registration:', error);
        throw error;
    }
}

/**
 * Handles citizen user login by sending credentials to the backend API.
 * Stores the received token in localStorage upon successful login.
 * @param {Object} credentials - The user's login credentials (email, password).
 * @returns {Promise<Object>} - A promise that resolves with the API response data.
 */
export async function loginCitizen(credentials) {
    try {
        // Corrected: API path to /api/users/login
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        if (data.token) {
            localStorage.setItem('token', data.token);
        }

        return data;
    } catch (error) {
        console.error('Error during citizen login:', error);
        throw error;
    }
}

/**
 * Logs out the citizen user by removing the token from localStorage.
 * Optionally, can send a request to the backend to invalidate the session/token.
 */
export async function logoutCitizen() {
    console.log('Attempting to log out citizen...');
    const token = localStorage.getItem('token');

    if (token) {
        try {
            // Corrected: API path to /api/users/logout
            const response = await fetch('/api/users/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                console.log('Citizen token successfully invalidated on server.');
            } else {
                console.error('Failed to invalidate citizen token on server:', await response.text());
            }
        } catch (error) {
            console.error('Error during server-side citizen logout:', error);
        }
    }

    localStorage.removeItem('token');
    console.log('Client-side citizen token removed. Redirecting...');

    window.location.href = '/citizen/login.html';
}

/**
 * Checks if a citizen user is authenticated by verifying the presence of a token.
 * @returns {boolean} - True if a token is found, false otherwise.
 */
export function isCitizenAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
}
