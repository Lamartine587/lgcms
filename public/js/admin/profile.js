const API_URL = '/api/admin';

// DOM Elements
const profileForm = document.getElementById('profile-form');
const avatarInput = document.getElementById('avatar-input');
const profileAvatar = document.getElementById('profile-avatar');
const adminName = document.getElementById('admin-name');
const emailInput = document.getElementById('email');
const fullNameInput = document.getElementById('full-name');
const phoneInput = document.getElementById('phone');
const departmentInput = document.getElementById('department');
const bioInput = document.getElementById('bio');

// Load admin profile data
async function loadAdminProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/admin/login';
            return;
        }

        const response = await fetch(`${API_URL}/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch profile');
        }

        const data = await response.json();
        
        // Update profile fields
        adminName.textContent = data.fullName || 'Admin User';
        fullNameInput.value = data.fullName || '';
        emailInput.value = data.email || '';
        phoneInput.value = data.phone || '';
        departmentInput.value = data.department || '';
        bioInput.value = data.bio || '';
        
        // Update avatar if exists
        if (data.avatar) {
            profileAvatar.src = `/uploads/${data.avatar}`;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Failed to load profile data');
    }
}

// Handle avatar upload
avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const formData = new FormData();
        formData.append('avatar', file);

        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload avatar');
        }

        const data = await response.json();
        profileAvatar.src = `/uploads/${data.avatar}`;
        alert('Profile picture updated successfully!');
    } catch (error) {
        console.error('Error uploading avatar:', error);
        alert('Failed to upload profile picture');
    }
});

// Handle profile form submission
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const token = localStorage.getItem('token');
        const formData = {
            fullName: fullNameInput.value,
            email: emailInput.value,
            phone: phoneInput.value,
            department: departmentInput.value,
            bio: bioInput.value
        };

        // Add password fields if provided
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword && currentPassword) {
            if (newPassword !== confirmPassword) {
                throw new Error('New passwords do not match');
            }
            formData.currentPassword = currentPassword;
            formData.newPassword = newPassword;
        }

        const response = await fetch(`${API_URL}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update profile');
        }

        const data = await response.json();
        adminName.textContent = data.fullName;
        alert('Profile updated successfully!');
        
        // Clear password fields
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
    } catch (error) {
        console.error('Error updating profile:', error);
        alert(error.message || 'Failed to update profile');
    }
});

// Initialize
function initAdminProfile() {
    loadAdminProfile();
}

export { initAdminProfile };