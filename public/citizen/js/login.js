// public/js/citizen/login-init.js

import { loginUser } from '/citizen/js/auth.js'; // Ensure this path is correct

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message'); // Assuming you have a message div in login.html

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent default form submission

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const data = await loginUser(email, password);
                
                // Display success message
                if (messageDiv) {
                    messageDiv.textContent = data.message || 'Login successful! Redirecting to dashboard...';
                    messageDiv.style.color = 'green';
                }
                
                // Redirect to citizen dashboard or appropriate page after successful login
                // You will need to create a citizen dashboard page (e.g., citizen/dashboard.html)
                setTimeout(() => {
                    window.location.href = '/citizen/dashboard.html'; // Redirect to citizen dashboard
                }, 1500); // Redirect after 1.5 seconds

            } catch (error) {
                // Display error message
                if (messageDiv) {
                    messageDiv.textContent = error.message || 'Login failed.';
                    messageDiv.style.color = 'red';
                }
                console.error('Login failed:', error);
            }
        });
    } else {
        console.error('Login form not found.');
    }
});
