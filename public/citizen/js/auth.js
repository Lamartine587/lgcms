// public/js/auth.js

// Function to handle citizen registration
export async function registerCitizen(fullName, username, email, password) {
    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fullName, username, email, password, role: 'citizen' }) // Ensure role is sent
        });

        const data = await response.json();

        if (!response.ok) {
            // If the server responded with an error, throw it
            throw new Error(data.message || 'Registration failed');
        }

        return data; // Return success data from the backend
    } catch (error) {
        console.error('Error during citizen registration:', error);
        throw error; // Re-throw to be handled by the caller (register-init.js)
    }
}

// Function to handle login for both citizens and admins
export async function loginUser(email, password) {
    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        // Store token in localStorage
        localStorage.setItem('token', data.token);

        return data; // Return user data and token
    } catch (error) {
        console.error('Error during login:', error);
        throw error;
    }
}

// Function to handle logout
export function logoutUser() {
    // For a client-side logout, simply remove the token
    localStorage.removeItem('token');
    // You might also want to redirect the user
    // window.location.href = '/login.html'; // Or wherever your main login page is
    console.log('User logged out.');
}
