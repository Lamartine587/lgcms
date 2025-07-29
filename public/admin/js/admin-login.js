// public/js/admin-login.js

// Ensure the DOM is fully loaded before attaching the event listener
document.addEventListener('DOMContentLoaded', () => {
    const adminLoginForm = document.getElementById('adminLoginForm');

    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = {
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                role: 'admin' // Ensure login as admin
            };

            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    // Store token and redirect
                    localStorage.setItem('token', data.token);
                    // IMPORTANT: Use an absolute path for redirection to avoid incorrect relative resolution.
                    // This will correctly redirect to http://localhost:5000/admin/dashboard.html
                    window.location.href = '/admin/dashboard.html';
                } else {
                    console.error('Login failed:', data.message || 'Unknown error');
                    alert(data.message || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login');
            }
        });
    } else {
        console.error('Admin login form not found!');
    }
});
