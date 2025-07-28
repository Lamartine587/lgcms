const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', async () => {
    const profileForm = document.getElementById('profileForm');
    const fullNameInput = document.getElementById('fullName');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const genderSelect = document.getElementById('gender');
    const dobInput = document.getElementById('dob');
    const nationalityInput = document.getElementById('nationality');
    const identificationInput = document.getElementById('identification');
    const occupationInput = document.getElementById('occupation');
    const countyInput = document.getElementById('county');
    const departmentInput = document.getElementById('department');
    const officeInput = document.getElementById('office');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    if (!userInfo || !userInfo.token) {
        window.location.href = 'login.html';
        return;
    }

    // Function to fetch and populate profile data
    async function fetchProfileData() {
        try {
            const res = await fetch(`${API_URL}/users/profile`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userInfo.token}`,
                },
            });

            const data = await res.json();

            if (res.ok) {
                fullNameInput.value = data.fullName || '';
                usernameInput.value = data.username || '';
                emailInput.value = data.email || '';
                phoneInput.value = data.phone || '';
                genderSelect.value = data.gender || '';
                // Ensure DOB is formatted correctly for date input
                dobInput.value = data.dob ? new Date(data.dob).toISOString().split('T')[0] : '';
                nationalityInput.value = data.nationality || '';
                identificationInput.value = data.identification || '';
                occupationInput.value = data.occupation || '';
                countyInput.value = data.county || '';
                departmentInput.value = data.department || '';
                officeInput.value = data.office || '';
            } else {
                alert(data.message || 'Failed to fetch profile. Please log in again.');
                localStorage.removeItem('userInfo');
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            alert('An error occurred while fetching profile. Please check console for details.');
            localStorage.removeItem('userInfo');
            window.location.href = 'login.html';
        }
    }

    // Call fetchProfileData on page load
    await fetchProfileData();

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newPassword = passwordInput.value;
            const confirmNewPassword = confirmPasswordInput.value;

            if (newPassword && newPassword !== confirmNewPassword) {
                alert('New passwords do not match');
                return;
            }

            // Client-side validation for required fields on update
            // These fields are required for update, even if optional on initial registration
            if (!fullNameInput.value || !usernameInput.value || !emailInput.value || !phoneInput.value || !genderSelect.value || !dobInput.value || !nationalityInput.value || !identificationInput.value || !occupationInput.value || !countyInput.value || !departmentInput.value || !officeInput.value) {
                alert('Please fill in all required profile fields before saving.');
                return;
            }


            const updateData = {
                fullName: fullNameInput.value,
                username: usernameInput.value,
                // email is readonly, so we don't send it from here, backend keeps existing
                phone: phoneInput.value,
                gender: genderSelect.value,
                dob: dobInput.value,
                nationality: nationalityInput.value,
                identification: identificationInput.value,
                occupation: occupationInput.value,
                county: countyInput.value,
                department: departmentInput.value,
                office: officeInput.value,
            };

            if (newPassword) {
                updateData.password = newPassword;
            }

            console.log('Sending update data:', updateData); // DEBUG: Log data being sent

            try {
                const res = await fetch(`${API_URL}/users/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${userInfo.token}`,
                    },
                    body: JSON.stringify(updateData),
                });

                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('userInfo', JSON.stringify(data));
                    alert('Profile updated successfully!');
                    passwordInput.value = '';
                    confirmPasswordInput.value = '';
                    // Re-fetch data to ensure UI reflects latest state, then redirect
                    await fetchProfileData(); // Optional: re-fetch to confirm data
                    window.location.href = 'admin-dashboard.html';
                } else {
                    alert(data.message || 'Profile update failed. Check console for details.');
                    console.error('Profile update error response:', data); // DEBUG: Log error response
                }
            } catch (error) {
                console.error('Error updating profile:', error); // DEBUG: Log network/fetch error
                alert('An error occurred during profile update. Please check console for details.');
            }
        });
    }
});