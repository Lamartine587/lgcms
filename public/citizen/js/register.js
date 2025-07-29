// public/js/citizen/register-init.js

import { registerCitizen } from '/citizen/js/auth.js'; // Ensure this path is correct

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const messageDiv = document.getElementById('message');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent default form submission

            const fullName = document.getElementById('fullName').value;
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                messageDiv.textContent = 'Passwords do not match.';
                messageDiv.style.color = 'red';
                return;
            }

            try {
                const data = await registerCitizen(fullName, username, email, password);
                messageDiv.textContent = data.message || 'Registration successful! Redirecting to login...';
                messageDiv.style.color = 'green';
                registerForm.reset(); // Clear the form
                
                // Redirect to login page after successful registration
                setTimeout(() => {
                    window.location.href = '/citizen/login.html'; // Redirect to citizen login
                }, 2000); // Redirect after 2 seconds
            } catch (error) {
                messageDiv.textContent = error.message || 'Registration failed.';
                messageDiv.style.color = 'red';
                console.error('Registration failed:', error);
            }
        });
    } else {
        console.error('Register form not found.');
    }
});
