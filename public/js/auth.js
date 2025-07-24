document.addEventListener('DOMContentLoaded', () => {
    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorElement = document.getElementById('login-error');
            
            try {
                const data = await apiCall('/users/login', 'POST', { email, password });
                
                localStorage.setItem(TOKEN_KEY, data.token);
                localStorage.setItem(USER_ROLE_KEY, data.role);
                localStorage.setItem(USER_NAME_KEY, data.username);
                
                updateNavVisibility();
                
                // Redirect based on role
                const redirectUrl = data.role === 'citizen' ? '/my-complaints.html' : '/admin-dashboard.html';
                window.location.href = redirectUrl;
                
            } catch (error) {
                displayMessage(errorElement, error.message, true);
            }
        });
    }

    // Register Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                username: document.getElementById('register-username').value,
                email: document.getElementById('register-email').value,
                password: document.getElementById('register-password').value,
                confirmPassword: document.getElementById('register-confirm-password').value,
                role: document.getElementById('register-role').value
            };
            
            const errorElement = document.getElementById('register-error');
            
            if (formData.password !== formData.confirmPassword) {
                displayMessage(errorElement, 'Passwords do not match', true);
                return;
            }
            
            try {
                const data = await apiCall('/users/register', 'POST', {
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    role: formData.role
                });
                
                localStorage.setItem(TOKEN_KEY, data.token);
                localStorage.setItem(USER_ROLE_KEY, data.role);
                localStorage.setItem(USER_NAME_KEY, data.username);
                
                updateNavVisibility();
                
                // Redirect based on role
                const redirectUrl = data.role === 'citizen' ? '/my-complaints.html' : '/admin-dashboard.html';
                window.location.href = redirectUrl;
                
            } catch (error) {
                displayMessage(errorElement, error.message, true);
            }
        });
    }
});