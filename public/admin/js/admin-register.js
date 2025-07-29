document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('adminRegisterForm');
    const errorDisplay = document.createElement('div');
    errorDisplay.className = 'error-message';
    form.appendChild(errorDisplay);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorDisplay.textContent = '';
        errorDisplay.style.display = 'none';

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';

        try {
            const formData = {
                username: document.getElementById('username').value.trim(),
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value,
                inviteCode: document.getElementById('inviteCode').value.trim()
            };

            // Client-side validation
            if (!formData.username || !formData.email || !formData.password || !formData.inviteCode) {
                throw new Error('All fields are required');
            }

            if (formData.password !== document.getElementById('confirmPassword').value) {
                throw new Error('Passwords do not match');
            }

            const response = await fetch('http://localhost:5000/api/admin/register', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `Registration failed (Status: ${response.status})`);
            }
            
            alert('Admin registered successfully!');
            window.location.href = '/admin/login.html';
            
        } catch (error) {
            console.error('Registration Error:', error);
            errorDisplay.textContent = error.message;
            errorDisplay.style.display = 'block';
            errorDisplay.style.color = 'red';
            errorDisplay.style.marginTop = '10px';
            errorDisplay.style.padding = '10px';
            errorDisplay.style.backgroundColor = '#ffeeee';
            errorDisplay.style.borderRadius = '4px';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    });
});