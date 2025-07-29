const API_URL = 'http://localhost:5000/api';

// Admin Registration Handler
document.addEventListener('DOMContentLoaded', () => {
    const adminRegisterForm = document.getElementById('adminRegisterForm');
    if (adminRegisterForm) {
        adminRegisterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form values
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const inviteCode = document.getElementById('inviteCode').value.trim();

            // Validate inputs
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            if (!username || !email || !password || !inviteCode) {
                alert('Please fill in all fields');
                return;
            }

            try {
                const response = await fetch(`${API_URL}/admin/register.html`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username,
                        email,
                        password,
                        inviteCode,
                        role: 'admin'
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Admin registration successful! Please login.');
                    window.location.href = '/admin/login.html';
                } else {
                    throw new Error(data.message || 'Registration failed');
                }
            } catch (error) {
                console.error('Admin registration error:', error);
                alert(error.message || 'An error occurred during registration. Please try again.');
            }
        });
    }

    // Regular User Registration
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('fullName').value;
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            try {
                const res = await fetch(`${API_URL}/users/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ fullName, username, email, password }),
                });

                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('userInfo', JSON.stringify(data));
                    window.location.href = data.role === 'admin' 
                        ? '../admin/admin-dashboard.html' 
                        : 'dashboard.html';
                } else {
                    alert(data.message || 'Registration failed');
                }
            } catch (error) {
                console.error('Error during registration:', error);
                alert('An error occurred during registration. Please try again.');
            }
        });
    }

    // Login Handler (for both admin and regular users)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch(`${API_URL}/users/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('userInfo', JSON.stringify(data));
                    window.location.href = data.role === 'admin' 
                        ? '../admin/admin-dashboard.html' 
                        : 'dashboard.html';
                } else {
                    alert(data.message || 'Invalid email or password');
                }
            } catch (error) {
                console.error('Error during login:', error);
                alert('An error occurred during login. Please try again.');
            }
        });
    }

    // Logout Handler
    const logoutButtons = document.querySelectorAll('.logout-button');
    logoutButtons.forEach(button => {
        button.addEventListener('click', () => {
            localStorage.removeItem('userInfo');
            window.location.href = 'login.html';
        });
    });
});

// Admin Specific Functions
async function adminLogin(username, password) {
    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            throw new Error('Admin login failed');
        }
        
        const data = await response.json();
        localStorage.setItem('adminToken', data.token);
        return data.token;
    } catch (error) {
        console.error('Admin login error:', error);
        throw error;
    }
}

async function validateAdminToken(token) {
    try {
        const response = await fetch(`${API_URL}/admin/validate-token`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.ok;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}